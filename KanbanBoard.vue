<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { VueDraggableNext } from 'vue-draggable-next';
import axios from 'axios';
import KanbanColumn from './KanbanColumn.vue';
import BoardSettingsModal from './BoardSettingsModal.vue';

const props = defineProps({
    projectHash: { type: String, required: true },
    currentUserId: { type: Number, required: true },
    canChangeStatus: { type: Boolean, default: false },
    availableStatuses: { type: Array, default: () => [] },
    initialBoardId: { type: [String, Number], default: null },
});

const isSidebarOpen = ref(true);
const boards = ref([]);
const projectStatuses = ref([]);
const activeBoardId = ref(null);
const isDraggingTask = ref(false);
const zoomLevel = ref(1);
const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;

const zoomIn = () => { zoomLevel.value = Math.min(zoomLevel.value + ZOOM_STEP, ZOOM_MAX); };
const zoomOut = () => { zoomLevel.value = Math.max(zoomLevel.value - ZOOM_STEP, ZOOM_MIN); };
const resetZoom = () => { zoomLevel.value = 1; };

// Реактивная синхронизация статусов из пропсов (при добавлении нового статуса в настройках)
watch(() => props.availableStatuses, (newVal) => {
    if (newVal && newVal.length > 0) {
        projectStatuses.value = [...newVal];
    }
}, { deep: true });

// Бэклог стейт
const backlogTasks = ref([]);
const newBacklogName = ref('');
const backlogSearch = ref('');
const backlogLoading = ref(false);
const backlogSubmitting = ref(false);
const backlogNextPageUrl = ref(null);
const backlogScrollContainer = ref(null);
let searchDebounceTimeout = null;

// Модалки
const showCreateModal = ref(false);
const showSettingsModal = ref(false);
const newBoardTitle = ref('');

const activeBoard = computed(() => boards.value.find(b => b.id === activeBoardId.value));

// Доска, для которой открыты настройки (может отличаться от activeBoard)
const settingsTargetBoard = ref(null);

// Drag-to-scroll для сетки колонок (как в tasks.vue)
const columnsGridRef = ref(null);
let isGridDragging = false;
let gridStartX = 0;
let gridScrollLeft = 0;

// Авто-скролл при перетаскивании задачи к краям сетки колонок
let autoScrollRaf = null;
const AUTO_SCROLL_SPEED = 12;
const AUTO_SCROLL_ZONE = 80;

const onTaskDragStart = () => {
    isDraggingTask.value = true;
    document.addEventListener('mousemove', onAutoScrollMouseMove);
};

const onTaskDragEnd = () => {
    isDraggingTask.value = false;
    document.removeEventListener('mousemove', onAutoScrollMouseMove);
    if (autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
    }
};

const onAutoScrollMouseMove = (e) => {
    const grid = columnsGridRef.value;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    const mouseX = e.clientX;

    // Убираем предыдущий запланированный скролл
    if (autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
    }

    let scrollAmount = 0;

    // Мышь у правого края — скроллим вправо
    if (mouseX > rect.right - AUTO_SCROLL_ZONE && mouseX < rect.right + 100) {
        const factor = (mouseX - (rect.right - AUTO_SCROLL_ZONE)) / AUTO_SCROLL_ZONE;
        scrollAmount = Math.min(factor * AUTO_SCROLL_SPEED, AUTO_SCROLL_SPEED);
    }
    // Мышь у левого края — скроллим влево
    else if (mouseX < rect.left + AUTO_SCROLL_ZONE && mouseX > rect.left - 100) {
        const factor = (AUTO_SCROLL_ZONE - (mouseX - rect.left)) / AUTO_SCROLL_ZONE;
        scrollAmount = -Math.min(factor * AUTO_SCROLL_SPEED, AUTO_SCROLL_SPEED);
    }

    if (scrollAmount !== 0) {
        autoScrollRaf = requestAnimationFrame(() => {
            grid.scrollLeft += scrollAmount;
            autoScrollRaf = null;
        });
    }
};

const startGridDrag = (e) => {
    // Не перехватываем drag, если пользователь тянет карточку задачи (VueDraggableNext)
    if (e.target.closest('.vx-kanban-card') || e.target.closest('.vx-card-drag-trigger')) return;
    isGridDragging = true;
    columnsGridRef.value.classList.add('active-dragging');
    gridStartX = e.pageX - columnsGridRef.value.offsetLeft;
    gridScrollLeft = columnsGridRef.value.scrollLeft;
};

const doGridDrag = (e) => {
    if (!isGridDragging) return;
    e.preventDefault();
    const x = e.pageX - columnsGridRef.value.offsetLeft;
    const walk = (x - gridStartX) * 1.5;
    columnsGridRef.value.scrollLeft = gridScrollLeft - walk;
};

const stopGridDrag = () => {
    isGridDragging = false;
    if (columnsGridRef.value) {
        columnsGridRef.value.classList.remove('active-dragging');
    }
};

const visibleColumns = computed(() => {
    if (!activeBoard.value) return [];
    // Для базовой доски и досок без настроек колонок показываем все статусы
    if (activeBoard.value.is_base || !activeBoard.value.settings_json || !activeBoard.value.settings_json.columns || activeBoard.value.settings_json.columns.length === 0) {
        return projectStatuses.value;
    }
    const boardColumnsConfig = activeBoard.value.settings_json.columns || [];

    return boardColumnsConfig
        .filter(c => c.visible)
        .map(c => {
            const fullStatus = projectStatuses.value.find(s => s.id === c.status_id);
            return fullStatus ? { ...fullStatus } : null;
        })
        .filter(c => c !== null);
});

const loadInitialData = async (preserveActiveBoard = false) => {
    try {
        const previousBoardId = activeBoardId.value;
        const response = await axios.get(`/projects/${props.projectHash}/kanban-boards/metadata`);
        boards.value = response.data.boards;
        projectStatuses.value = response.data.project_statuses;

        // Если передан initialBoardId — активируем нужную доску (гибкое сравнение: 'base' == 'base', 1 == '1')
        if (props.initialBoardId !== null && props.initialBoardId !== undefined) {
            const targetBoard = boards.value.find(b => b.id == props.initialBoardId);
            if (targetBoard) {
                activeBoardId.value = targetBoard.id;
                return;
            }
        }

        // Если нужно сохранить текущую доску (после настроек) — пытаемся найти её в обновлённом списке
        if (preserveActiveBoard && previousBoardId) {
            const stillExists = boards.value.some(b => b.id === previousBoardId);
            if (stillExists) {
                activeBoardId.value = previousBoardId;
                // Обновляем settingsTargetBoard, чтобы модалка настроек видела актуальный board
                settingsTargetBoard.value = boards.value.find(b => b.id === previousBoardId) || null;
                return;
            }
        }

        // Открываем первую доску по умолчанию (при первом входе это «Базовая»)
        if (boards.value.length > 0 && !activeBoardId.value) {
            activeBoardId.value = boards.value[0].id;
        }
    } catch (err) {
        console.error('Ошибка инициализации доски:', err);
    }
};

const switchBoard = (id) => {
    activeBoardId.value = id;
};

// БЭКЛОГ ЛОГИКА
const loadBacklog = async (pageUrl = null) => {
    if (backlogLoading.value) return;
    backlogLoading.value = true;

    const url = pageUrl || `/projects/${props.projectHash}/backlog/tasks`;
    try {
        const response = await axios.get(url, { params: { search: backlogSearch.value } });
        if (pageUrl) {
            backlogTasks.value.push(...response.data.data);
        } else {
            backlogTasks.value = response.data.data;
        }
        backlogNextPageUrl.value = response.data.next_page_url;
    } catch (err) {
        console.error('Ошибка бэклога:', err);
    } finally {
        backlogLoading.value = false;
    }
};

const handleBacklogScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 30 && backlogNextPageUrl.value) {
        loadBacklog(backlogNextPageUrl.value);
    }
};

const debounceBacklogSearch = () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        loadBacklog();
    }, 400);
};

const addBacklogTask = async () => {
    if (!newBacklogName.value.trim() || backlogSubmitting.value) return;
    backlogSubmitting.value = true;

    try {
        const response = await axios.post(`/projects/${props.projectHash}/backlog/tasks`, {
            name: newBacklogName.value.trim()
        });
        backlogTasks.value.unshift(response.data.task);
        newBacklogName.value = '';

        nextTick(() => {
            if (backlogScrollContainer.value) {
                backlogScrollContainer.value.scrollTop = 0;
            }
        });
    } catch (err) {
        console.error(err);
    } finally {
        backlogSubmitting.value = false;
    }
};

// Модалки
const openCreateBoardModal = () => {
    newBoardTitle.value = '';
    showCreateModal.value = true;
};

const submitCreateBoard = async () => {
    if (!newBoardTitle.value.trim()) return;
    try {
        const response = await axios.post(`/projects/${props.projectHash}/kanban-boards`, {
            name: newBoardTitle.value.trim()
        });
        boards.value.push(response.data.board);
        activeBoardId.value = response.data.board.id;
        showCreateModal.value = false;
    } catch (err) {
        console.error(err);
    }
};

const openBoardSettings = (board) => {
    settingsTargetBoard.value = board;
    showSettingsModal.value = true;
};

const handleTaskMovedInUI = () => {
    loadBacklog();
};

// Глобальная синхронизация
const handleGlobalBoardSync = (event) => {
    const { action, task } = event.detail;

    if (action === 'attach' && task.is_backlog === false) {
        const idx = backlogTasks.value.findIndex(t => t.id === task.id);
        if (idx !== -1) {
            backlogTasks.value.splice(idx, 1);
        }
    } else if (action === 'detach' || task.is_backlog === true) {
        loadBacklog();
    }
};

const handleGlobalTaskMove = (e) => {
    const { isBacklog } = e.detail;
    if (isBacklog) loadBacklog();
};

onMounted(() => {
    loadInitialData();
    loadBacklog();
    window.addEventListener('kanban-board-sync', handleGlobalBoardSync);
    window.addEventListener('task-moved-globally', handleGlobalTaskMove);
    document.addEventListener('mouseup', stopGridDrag);
    document.addEventListener('mousemove', onAutoScrollMouseMove);
});

onUnmounted(() => {
    window.removeEventListener('kanban-board-sync', handleGlobalBoardSync);
    window.removeEventListener('task-moved-globally', handleGlobalTaskMove);
    document.removeEventListener('mouseup', stopGridDrag);
    document.removeEventListener('mousemove', onAutoScrollMouseMove);
});
</script>

<template>
    <div class="vx-kanban-layout d-flex position-relative overflow-hidden w-100 h-100 bg-white">

        <!-- ЛЕВАЯ БОКОВАЯ ПАНЕЛЬ (Сайдбар) -->
        <div class="vx-kanban-sidebar border-end d-flex flex-column h-100" :class="{ 'is-open': isSidebarOpen }">

            <!-- Блок 1: Управление кастомными досками -->
            <div class="p-3 border-bottom flex-shrink-0">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h6 class="text-uppercase fw-bold text-muted fs-11 tracking-wider mb-0">Мои доски</h6>
                    <button @click="openCreateBoardModal" class="btn btn-xs btn-soft-primary px-2 py-1 fs-11">
                        <i class="ri-add-line align-middle"></i> Доска
                    </button>
                </div>

                <!-- Список досок -->
                <div class="vx-boards-nav overflow-y-auto" style="max-height: 140px;">
                    <div
                        v-for="board in boards"
                        :key="board.id"
                        class="vx-board-nav-item p-2 rounded mb-1 cursor-pointer d-flex align-items-center justify-content-between"
                        :class="{ 'is-active': activeBoardId === board.id }"
                        @click="switchBoard(board.id)"
                    >
                        <span class="fs-13 fw-semibold text-truncate me-2">
                            <i class="ri-layout-kanban-line me-2 align-middle fs-14"></i>{{ board.name }}
                        </span>
                        <button v-if="board.user_id === currentUserId && !board.is_base" @click.stop="openBoardSettings(board)" class="btn btn-icon btn-sm text-muted opacity-50 hover-opacity-100 p-0 border-0 bg-transparent">
                            <i class="ri-settings-4-line"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Блок 2: Асинхронный Бэклог Проекта -->
            <div class="p-3 d-flex flex-column flex-grow-1 overflow-hidden">
                <h6 class="text-uppercase fw-bold text-muted fs-11 tracking-wider mb-2">Бэклог проекта</h6>

                <!-- Быстрый ввод в бэклог (только при наличии прав) -->
                <input
                    v-if="canChangeStatus"
                    v-model="newBacklogName"
                    @keyup.enter="addBacklogTask"
                    type="text"
                    class="form-control form-control-sm mb-2 fs-13"
                    placeholder="Что нужно сделать? (Enter)"
                    :disabled="backlogSubmitting"
                >

                <!-- Живой поиск по бэклогу -->
                <div class="position-relative mb-2 flex-shrink-0">
                    <input
                        v-model="backlogSearch"
                        @input="debounceBacklogSearch"
                        type="text"
                        class="form-control form-control-sm ps-4 fs-12"
                        placeholder="Поиск по бэклогу и задачам"
                    >
                    <i class="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted fs-12"></i>
                </div>

                <!-- Контейнер бэклог-элементов с Infinite Scroll -->
                <div class="vx-backlog-scroll-area flex-grow-1 overflow-y-auto pe-1" ref="backlogScrollContainer" @scroll="handleBacklogScroll">

                    <!-- Draggable область для бэклога -->
                    <VueDraggableNext
                        v-model:list="backlogTasks"
                        :group="{ name: 'kanban-tasks', pull: true, put: true }"
                        item-key="id"
                        ghost-class="vx-card-ghost"
                        drag-class="vx-card-dragging"
                        @start="onTaskDragStart"
                        @end="onTaskDragEnd"
                        @change="handleTaskMovedInUI"
                        handle=".vx-drag-handle"
                        class="d-flex flex-column gap-2"
                    >
                        <div v-for="element in backlogTasks" :key="element.id" class="vx-backlog-item border rounded p-2 bg-light bg-opacity-50 position-relative d-flex align-items-start gap-2">
                            <span class="vx-drag-handle cursor-grab mt-1 opacity-50"><i class="ri-drag-move-2-line fs-13"></i></span>
                            <div class="flex-grow-1 fs-13 text-dark fw-medium text-break line-clamp-3">
                                {{ element.name }}
                            </div>
                        </div>
                    </VueDraggableNext>

                    <div v-if="backlogLoading" class="text-center py-2">
                        <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
                    </div>
                </div>
            </div>

        </div>

        <!-- Кнопка-тумблер скрытия сайдбара (всегда видна) -->
        <button @click="isSidebarOpen = !isSidebarOpen" class="vx-sidebar-toggle position-absolute border shadow-sm rounded-circle bg-white d-flex align-items-center justify-content-center"
            :style="{ left: isSidebarOpen ? '284px' : '8px' }">
            <i :class="isSidebarOpen ? 'ri-arrow-left-s-line' : 'ri-arrow-right-s-line'"></i>
        </button>

        <!-- ЦЕНТРАЛЬНАЯ ОБЛАСТЬ: СЕТКА КАНБАН-КОЛОНОК -->
        <div class="vx-kanban-main flex-grow-1 h-100 d-flex flex-column overflow-hidden" :class="{ 'sidebar-shifted': isSidebarOpen }">
            <div v-if="activeBoard" class="vx-kanban-header p-3 border-bottom d-flex align-items-center justify-content-between bg-light bg-opacity-20 flex-shrink-0" :class="{ 'sidebar-closed': !isSidebarOpen }">
                <h5 class="mb-0 fw-bold fs-16 text-dark">
                    <i class="ri-layout-kanban-line text-primary me-2 align-middle"></i>{{ activeBoard.name }}
                </h5>
                <div class="d-flex align-items-center gap-2">
                    <!-- Переключатель масштаба -->
                    <div class="btn-group btn-group-sm" role="group">
                        <button @click="zoomOut" :disabled="zoomLevel <= 0.5" type="button" class="btn btn-soft-secondary" title="Уменьшить">
                            <i class="ri-zoom-out-line"></i>
                        </button>
                        <button @click="resetZoom" type="button" class="btn btn-soft-secondary" title="Сбросить масштаб">
                            <span class="fs-11">{{ Math.round(zoomLevel * 100) }}%</span>
                        </button>
                        <button @click="zoomIn" :disabled="zoomLevel >= 1.5" type="button" class="btn btn-soft-secondary" title="Увеличить">
                            <i class="ri-zoom-in-line"></i>
                        </button>
                    </div>
                    <button v-if="!activeBoard.is_base" @click="openBoardSettings(activeBoard)" class="btn btn-sm btn-soft-secondary fs-12 px-3">
                        <i class="ri-settings-4-line align-middle me-1"></i> Настройки доски
                    </button>
                </div>
            </div>

            <!-- Горизонтальная сетка колонок (drag-to-scroll) -->
            <div
                ref="columnsGridRef"
                class="vx-kanban-columns-grid d-flex flex-grow-1 overflow-x-auto p-3 gap-3 align-items-stretch custom-horizontal-scrollbar"
                :style="{ zoom: zoomLevel }"
                @mousedown="startGridDrag"
                @mousemove="doGridDrag"
                @mouseleave="stopGridDrag"
            >
                <kanban-column
                    v-for="column in visibleColumns"
                    :key="column.id"
                    :column="column"
                    :board-id="activeBoardId"
                    :project-hash="projectHash"
                    @task-moved="handleTaskMovedInUI"
                    @drag-start="onTaskDragStart"
                    @drag-end="onTaskDragEnd"
                />
            </div>
        </div>

        <!-- МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ДОСКИ -->
        <div v-if="showCreateModal" class="modal fade show d-block bg-dark bg-opacity-50" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header border-bottom p-3">
                        <h5 class="modal-title fw-bold fs-15">Создать кастомную Канбан-доску</h5>
                        <button @click="showCreateModal = false" type="button" class="btn-close"></button>
                    </div>
                    <div class="modal-body p-3">
                        <label class="form-label fs-12 text-uppercase text-muted fw-bold mb-1">Название доски</label>
                        <input v-model="newBoardTitle" type="text" class="form-control" placeholder="Например: Спринт №4 (Разработка)" @keyup.enter="submitCreateBoard">
                    </div>
                    <div class="modal-footer border-top p-3 d-flex justify-content-end gap-2">
                        <button @click="showCreateModal = false" type="button" class="btn btn-light fs-13">Отмена</button>
                        <button @click="submitCreateBoard" type="button" class="btn btn-primary fs-13" :disabled="!newBoardTitle.trim()">Создать доску</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ПОДКЛЮЧЕНИЕ МОДАЛКИ НАСТРОЕК -->
        <board-settings-modal
            v-if="showSettingsModal && settingsTargetBoard"
            :show="showSettingsModal"
            :board="settingsTargetBoard"
            :project-statuses="projectStatuses"
            :project-hash="projectHash"
            @close="showSettingsModal = false"
            @updated="loadInitialData(true)"
        />
    </div>
</template>

<style scoped>
.vx-kanban-layout {
    height: 100%;
}
.vx-kanban-sidebar {
    width: 290px;
    background: #f9fbfd;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: absolute;
    left: 0;
    top: 0;
    z-index: 100;
    transform: translateX(-100%);
}
.vx-kanban-sidebar.is-open {
    transform: translateX(0);
}
.vx-sidebar-toggle {
    top: 15px;
    width: 28px;
    height: 28px;
    z-index: 101;
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.vx-kanban-main {
    transition: padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding-left: 0;
}
.vx-kanban-main.sidebar-shifted {
    padding-left: 290px;
}
.vx-kanban-header.sidebar-closed {
    padding-left: 48px !important;
}
.vx-board-nav-item { transition: all 0.2s ease; cursor: pointer; }
.vx-board-nav-item:hover { background: #eef2f7; }
.vx-board-nav-item.is-active { background: #405189; color: #ffffff !important; }
.vx-board-nav-item.is-active button i { color: #ffffff !important; }
.vx-card-ghost { opacity: 0.4; background: #e1e6eb !important; border: 2px dashed #405189 !important; }
.vx-card-dragging { transform: rotate(2deg); box-shadow: 0 10px 20px rgba(0,0,0,0.12) !important; }
.custom-horizontal-scrollbar::-webkit-scrollbar { height: 8px; }
.custom-horizontal-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
.custom-horizontal-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.tracking-wider { letter-spacing: 0.05em; }
.btn-xs { padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 0.2rem; }
.active-dragging { cursor: grabbing; user-select: none; }
</style>
