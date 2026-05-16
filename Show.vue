<script setup>
import Layout from "@/Layouts/ProjectsLayout.vue";
import { CountTo } from "vue3-count-to";
import { useForm } from '@inertiajs/vue3';
import { Link, router, usePage } from '@inertiajs/vue3';
import { VueDraggableNext } from 'vue-draggable-next';
import flatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import TopLinksInPage from "@/Components/new/TopLinksInPage.vue";
import AddUsersInTask from "@/Components/new/AddUsersInTask.vue";
import AddUserTeamInProject from "@/Components/new/AddUserTeamInProject.vue";
import TaskHourModal from "@/Components/new/TaskHourModal.vue";
import Swal from "sweetalert2";
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import crumbs from '@/params/breadcrumbs/projects.json';
import { getTeamColor } from '@/helpers/getAvatarColor';
import TaskComments from "@/Components/new/TaskComments.vue";
import axios from 'axios';
import KanbanBoard from './KanbanBoard.vue';
import BacklogTab from './BacklogTab.vue';
import FlowsTab from './components/flows/FlowsTab.vue';

const form = useForm({
    email: '',
    role: 0,
  });
const props = defineProps({
    project: Object,
    errors: Object,
    myTeams: Array, //todo сделать привязку к проекту. Чтобы показывались только те команды, которые еще не привязаны к проекту.
    debug: Array,
    participants: Object,
    project_roles: Object,
    tasks: Object,
    canManageMembers: Boolean,
    canAddTasks: Boolean,
    canChangeStatus: Boolean,
    priority_options: Array,
    projectStatuses: { type: Array, default: () => [] },
    projectMembers: { type: Array, default: () => [] },
});
console.log(props.project_roles)
// BTabs v-model работает с числовым индексом (0-based)
// Порядок вкладок: 0=Задачи, 1=Канбан, 2=Блок-схемы, 3=Активность, 4=Бэклог, 5=Настройки, 6=Документы, 7=Гант, 8=Участники
const tabIndexKanban = 1;
const tabIndexFlows = 2;
const tabIndexBacklog = 4;

const activeTab = ref(0);
const isLoading = ref(false);
const kanbanLoaded = ref(false);
const backlogLoaded = ref(false);
const flowsLoaded = ref(false);
const kanbanBoardId = ref(null);

const parseUrlParams = () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    if (params.get('kanban') === 'true') {
        kanbanLoaded.value = true;
        activeTab.value = tabIndexKanban;
    }
    if (params.get('backlog') === 'true') {
        backlogLoaded.value = true;
        activeTab.value = tabIndexBacklog;
    }
    const boardParam = params.get('board');
    kanbanBoardId.value = boardParam !== null ? boardParam : null;
};

onMounted(() => {
    parseUrlParams();
});

// Watch for tab changes to update URL params
watch(activeTab, (newIdx) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);

    if (newIdx === tabIndexKanban) {
        url.searchParams.set('kanban', 'true');
    } else {
        url.searchParams.delete('kanban');
    }

    if (newIdx === tabIndexBacklog) {
        url.searchParams.set('backlog', 'true');
    } else {
        url.searchParams.delete('backlog');
    }

    window.history.replaceState({}, '', url.toString());
});

// Надёжный триггер загрузки вкладок при переключении activeTab
watch(activeTab, (newIdx) => {
  if (newIdx === tabIndexKanban) kanbanLoaded.value = true;
  if (newIdx === tabIndexFlows) flowsLoaded.value = true;
  if (newIdx === tabIndexBacklog) backlogLoaded.value = true;
});

// Watch for kanban/backlog loaded to set URL when clicked directly
watch(kanbanLoaded, (loaded) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (loaded) {
        url.searchParams.set('kanban', 'true');
    } else {
        url.searchParams.delete('kanban');
    }
    window.history.replaceState({}, '', url.toString());
});

watch(backlogLoaded, (loaded) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (loaded) {
        url.searchParams.set('backlog', 'true');
    } else {
        url.searchParams.delete('backlog');
    }
    window.history.replaceState({}, '', url.toString());
});

// Отслеживаем Inertia-навигацию (router.get на ту же страницу не пересоздаёт компонент)
// nextTick ждёт history.pushState от Inertia, чтобы window.location.search был актуальным
watch(() => usePage().url, () => {
    nextTick(() => {
        parseUrlParams();
    });
}, { immediate: true });

const actualRole = ref(-1);
const showForm = ref(false);
const showFormAddTask = ref(false);

const whenCloseForm = () => {
    loadParticipants();
}

const loadParticipants = () => {
    activeTab.value = 8; // Вкладка "Участники" (0-based index)

    // Загружаем только если данных еще нет
        isLoading.value = true;
            router.reload({
                // Ключ должен СОВПАДАТЬ с ключом в контроллере
                only: ['participants'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    isLoading.value = false;
                },
                onError: () => {
                    isLoading.value = false;
                }
            });
};

const showModal = ref(false);
const currentTask = ref(null);
const chartOptions = {
                chart: {
                    type: "radialBar",
                    width: 105,
                    sparkline: {
                        enabled: true,
                    }
                },
                dataLabels: {
                    enabled: false,
                },
                plotOptions: {
                    radialBar: {
                        hollow: {
                            margin: 0,
                            size: '70%'
                        },
                        track: {
                            margin: 1
                        },
                        dataLabels: {
                            show: true,
                            name: {
                                show: false
                            },
                            value: {
                                show: true,
                                fontSize: '16px',
                                fontWeight: 600,
                                offsetY: 8,
                            }
                        }
                    },
                },
                colors: ["#0ab39c"]
            }
  const addMember = () => {
      form.post(route('projects.members.store', props.project.hash), {
          onSuccess: () => {
              form.reset();
              alert('Пользователь добавлен!');
          },
      });
  };
  const teamForm = useForm({
    team_id: '',
    role: 0
});
const addTeamToProject = () => {
    // Отправляем POST запрос на роут добавления команды к проекту
    teamForm.post(route('projects.teams.store', props.project.hash), {
        onSuccess: () => {
            teamForm.reset(); // Сбрасываем форму при успехе
            alert('Команда успешно привязана!');
        },
        onError: (errors) => {
            console.error('Ошибка при добавлении команды:', errors);
        },
        preserveScroll: true, // Чтобы страница не дергалась вверх
    });
};
const removeTeamFromProjectOrTask = (teamId, teamName, taskHash) => {
    if (confirm(`Вы уверены, что хотите отвязать команду "${teamName}"?`)) {
        router.delete(route('projects.teams.destroy', {
            project: props.project.hash,
            team: teamId,
            task: taskHash
        }), {
            preserveScroll: true, // Чтобы страница не дергалась вверх
            onSuccess: () => {
                // Автоматически дергаем нашу функцию загрузки участников
                loadParticipants();
            }
        });
    }
};
// // Удаление участника
// const removeMember = (userId) => {
//     if(confirm('Удалить участника из проекта?')) {
//         router.delete(route('projects.members.destroy', { project: props.project.hash, user: userId }));
//     }
// };
// const statusForm = useForm({
//     name: '',
//     level: 'task', // значение по умолчанию
//     task_id: props.task?.id, // для уровня "только для этой задачи"
//     project_id: props.project.id // для уровней "задача" и "проект"
// });

const saveNewStatus = () => {
    statusForm.post(route('task-statuses.store'), {
        preserveScroll: true,
        onSuccess: () => {
            statusForm.reset('name'); // очищаем только имя после успеха
            // Закрыть окошко/меню, если нужно
        }
    });
};
const removeMember = (member) => {
    const identifier = member.is_pending ? member.email : member.id;
    console.log(12345)
    router.delete(route('projects.members.destroy', props.project.hash), {
    data: { user: identifier, type: member.source.type, hash: member.source.hash},
    // 2. ЗАПРЕЩАЕМ перезагрузку состояния и прыжки скролла
    preserveState: true,
    preserveScroll: true,

    // 3. Просим сервер обновить ТОЛЬКО участников (Partial Reload)
    only: ['participants'],
    // onSuccess: () => loadParticipants()
    });
};
const savedId = ref(null);
const changeTeamRole = (team, newRoleId) => {
    router.post(route('projects.members.role.update', props.project.hash), {
        team_id: team.id,
        role: newRoleId
    }, {
        preserveState: true,
        preserveScroll: true,
        only: ['participants'],
        onSuccess: () => {
            savedId.value = 'team_' + team.id; // Префикс для отличия от юзеров
            setTimeout(() => { savedId.value = null; }, 2000);
        }
    });
};
const changeRole = (member, newRoleId) => {
    const identifier = member.is_pending ? member.email : member.id;
    router.post(route('projects.members.role.update', props.project.hash), {
        user: member.is_pending ? member.email : member.id,
        role: newRoleId
    }, {
        preserveState: true,  // Сохраняет текущее состояние компонентов (вкладки, инпуты)
        preserveScroll: true, // Запрещает странице прыгать вверх
        only: ['participants'],
        onSuccess: () => {
            // Устанавливаем ID для показа галочки
            savedId.value = identifier;

            // Скрываем её через 2 секунды
            setTimeout(() => {
                savedId.value = null;
            }, 2000);
        }
    });
};

// Отмена инвайта
const cancelInvite = (inviteId) => {
    router.delete(route('projects.invitations.destroy', inviteId));
};
const taskForm = useForm({
    name: '',
    description: ''
});

const createTask = () => {
    taskForm.post(route('tasks.store', props.project.hash), {
        preserveScroll: true,
        onSuccess: () => taskForm.reset(),
    });
};
 const openTask = (hash) => {
            router.visit(route('tasks_view', { taskHash: hash }));
        };
const deleteTask = (task) => {
    window.dispatchEvent(new CustomEvent('trigger-confirm', {
        detail: {
            title: "Удалить задачу?",
            text: `Задача "${task.name}" будет удалена навсегда!`,
            routeName: 'tasks.destroy',
            routeParams: { project: props.project.hash, task: task.hash },
            method: 'delete',
            confirmButtonText: "Удалить"
        }
    }));
};
//     const swalWithBootstrapButtons = Swal.mixin({
//         customClass: {
//           confirmButton: "btn btn-success",
//           cancelButton: "btn btn-danger ml-2",
//         },
//         buttonsStyling: false,
//       });



//       swalWithBootstrapButtons
//         .fire({
//           title: "Удалить проект?",
//           text: "Все задачи и данные к ним будут безвозвратно потеряны!",
//           icon: "warning",
//           confirmButtonText: "Удалить",
//           cancelButtonText: "Отмена",
//           showCancelButton: true,
//         })
//         .then((result) => {
//           if (result.value) {
//             router.delete(route('tasks.destroy', { project: props.project.hash, task: task.id }), {
//             preserveScroll: true
//             });
//             swalWithBootstrapButtons.fire(
//               "Deleted!",
//               "Your file has been deleted.",
//               "success"
//             );
//           }
//         });


//         const openAssignModal = (task) => {
//             // 1. Запоминаем текущую задачу, чтобы знать ID при сохранении
//             // activeTask.value = task;

//             // // 2. Предзаполняем форму текущими данными задачи из базы
//             // // Используем .map(u => u.id), так как в task.assigned_users лежат объекты,
//             // // а на сервер нам нужно отправить только массив их ID.
//             // assignForm.user_ids = task.assigned_users ? task.assigned_users.map(u => u.id) : [];
//             // assignForm.team_ids = task.assigned_teams ? task.assigned_teams.map(t => t.id) : [];

//             // 3. Открываем модальное окно (зависит от вашей библиотеки UI, например Bootstrap Vue)
//             isAssignModalOpen.value = true;

//             // Если используете нативный Bootstrap JS:
//             // new bootstrap.Modal(document.getElementById('assignModal')).show();
//         };
//     // if (confirm(`Вы уверены, что хотите удалить задачу "${task.name}"?`)) {
//     //     router.delete(route('tasks.destroy', { project: props.project.hash, task: task.id }), {
//     //         preserveScroll: true, // Чтобы страница не прыгала вверх после удаления
//     //         onSuccess: () => {
//     //             // Можно добавить уведомление о успехе
//     //         }
//     //     });
//     // }
// };

// const filteredMembers = computed(() => {
//     if (!props.participants) return [];

//     const members = props.participants.members || [];
//     const val = actualRole.value;

//     if (val == -1) return members;

//     return members.filter(u => {
//         if (val == 2) return !u.is_external && !u.is_pending; // Мои участники
//         if (val == 3) return u.is_external && !u.is_pending;  // Участники ответственного
//         if (val == 4) return u.is_pending;                   // Приглашенные (инвайты)
//         return false;
//     });
// });
const page = usePage();
    const userId = computed(() => page.props.auth.user.id);
const filteredMembers = computed(() => {
    // 1. Проверяем, что объект и массив пользователей существуют
    if (!props.participants || !props.participants.users) return [];

    const users = props.participants.users;
    const val = actualRole.value;

    // 2. Если фильтр "Все" (-1)
    if (val == -1) return users;

    return users.filter(u => {
        // Убедись, что типы данных совпадают (val может быть строкой из селектора)
        if (val == 2) return u.is_external === false && u.is_pending === false;
        if (val == 3) return u.is_external === true;
        if (val == 4) return u.is_pending === true;
        return false;
    });
});
const filteredTeams = computed(() => {

    if (!props.participants?.teams) return [];
    const teams = props.participants.teams;
    const val = actualRole.value;

    console.log(val)
    if (val == -1) return teams;
    // Оставляем только те роли, которые относятся к командам (0 и 1)
    return teams.filter(t => {
        if (val == 0) return t.is_external === false || t.is_external === undefined;
        console.log(2);
        if (val == 1) return t.owner_id === userId;
        return false;
    });
});
const formUpdate = useForm({
    _method: 'PATCH',
    name: props.project.name,
    description: props.project.description,
    cover: null,
});

const updateProject = () => {
    formUpdate.post(route('projects.update', props.project.hash), {
        preserveScroll: true,
    });
};

// Превью загруженного фото
const photoPreview = ref(props.project.cover_thumb_url);

const previewImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    formUpdate.cover = file;

    // Создаем временную локальную ссылку на файл в памяти браузера
    const reader = new FileReader();
    reader.onload = (e) => {
        photoPreview.value = e.target.result;
    };
    reader.readAsDataURL(file);
};
const totalPages = computed(() => Math.ceil(props.tasks.total / props.tasks.per_page));
const loadingPage = ref(null);

// Умная пагинация: окно вокруг текущей страницы с многоточиями
const visiblePages = computed(() => {
    const current = props.tasks.current_page;
    const total = totalPages.value;
    const delta = 2;
    const pages = [];

    pages.push(1);

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('...');

    if (total > 1) pages.push(total);

    return pages;
});

const tasksTableRef = ref(null);

const goToPage = (page) => {
    if (page < 1 || page > totalPages.value || page === props.tasks.current_page) return;
    loadingPage.value = page;
    router.reload({
        only: ['tasks'],
        data: { page },
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            nextTick(() => {
                tasksTableRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        },
        onFinish: () => { loadingPage.value = null; }
    });
};
const editingStatusId = ref(null);

const statusForm = useForm({
    id: null,
    name: '',
    color: '#34c38f',
    level: 'project',
    project_id: props.project.id,
    sort_order: 1
});

// Переход в режим редактирования
const editStatus = (status) => {
    editingStatusId.value = status.id;
    statusForm.id = status.id;
    statusForm.name = status.name;
    statusForm.color = status.color;
    statusForm.level = status.project_id ? 'project' : 'all_projects';
};

// Сброс формы
const cancelEdit = () => {
    editingStatusId.value = null;
    statusForm.reset();
};

const saveStatus = () => {
    const routeName = editingStatusId.value ? 'task-statuses.update' : 'task-statuses.store';
    const params = editingStatusId.value ? { status: editingStatusId.value } : {};

    statusForm.post(route(routeName, params), {
        preserveScroll: true,
        onSuccess: () => cancelEdit(),
    });
};

const deleteStatus = (id) => {
    if (confirm('Удалить этот статус? Это может повлиять на задачи.')) {
        router.delete(route('task-statuses.destroy', id), { preserveScroll: true });
    }
};
// Создаем локальную копию статусов для манипуляций (чтобы не мутировать пропсы напрямую)
const localStatuses = ref([...props.project.available_statuses]);

// Следим за обновлением пропсов (например, после добавления нового статуса)
watch(() => props.project.available_statuses, (newVal) => {
    localStatuses.value = [...newVal];
});

const onDragEnd = () => {
    // Собираем массив ID в новом порядке
    const sortedIds = localStatuses.value.map(s => s.id);

    router.post(route('task-statuses.reorder'), {
        ids: sortedIds,
        project_id: props.project.id
    }, {
        preserveScroll: true,
        onSuccess: () => {
            // Можно показать уведомление "Порядок сохранен"
        }
    });
};
const updateTaskStatus = (task, newStatus) => {
    // Если статус не изменился — ничего не делаем
    if (task.status_id === newStatus.id) return;

    // Сохраняем старый ID на случай ошибки
    const oldStatusId = task.status_id;
    const oldStatus = task.status;

    // Оптимистичное обновление в UI
    task.status_id = newStatus.id;
    task.status = newStatus;
    task.isUpdatingStatus = true; // Показываем иконку успеха

    router.patch(route('tasks.update-status', task.hash), {
        status_id: newStatus.id
    }, {
        preserveScroll: true,
        onSuccess: () => {
            // Через 1.5 секунды убираем иконку успеха
            setTimeout(() => {
                task.isUpdatingStatus = false;
            }, 1500);
        },
        onError: () => {
            // Откатываем изменения при ошибке
            task.status_id = oldStatusId;
            task.status = oldStatus;
            task.isUpdatingStatus = false;
            alert('Не удалось обновить статус');
        }
    });
};
const updatePriority = (task, priorityValue) => {
    router.patch(route('tasks.update-priority', task.hash), {
        priority: priorityValue // например, 'urgent'
    }, {
        preserveScroll: true
    });
};
const getPriorityColor = (val) => props.priority_options.find(o => o.value === val)?.color || 'secondary';
// 1. Функция для получения цвета бейджа (soft-вариант для Velzon)
const getPriorityVariant = (priorityValue) => {
    // Ищем цвет (danger, success и т.д.) в опциях из бэкенда
    const color = props.priority_options.find(opt => opt.value === priorityValue)?.color;
    return color ? `soft-${color}` : 'soft-secondary';
};

// 2. Функция для получения текста
const getPriorityLabel = (priorityValue) => {
    return props.priority_options.find(opt => opt.value === priorityValue)?.label || priorityValue;
};
const getHexColor = (colorName) => {
    const colors = {
        success: '#34c38f', // Зеленый (low)
        info: '#299cdb',    // Голубой (medium)
        warning: '#f7b84b', // Оранжевый (high)
        danger: '#f06548',  // Красный (urgent)
    };
    return colors[colorName] || '#6c757d';
};
const activities = ref([]);
const activitiesLoading = ref(false);

const fetchActivities = async () => {
    activitiesLoading.value = true;
    try {
        const response = await axios.get(`/api/projects/${props.project.hash}/activities`);
        activities.value = response.data.data;
    } catch (error) {
        console.error("Ошибка загрузки активности:", error);
    } finally {
        activitiesLoading.value = false;
    }
};

const chatOpened = ref(false);
const activeTask = ref(null);

const openChat = (task) => {
    activeTask.value = task;
    chatOpened.value = true;
};

onMounted(() => {
    fetchActivities();
});

// ============================================================
// Модернизация списка задач: хелперы и drag-to-scroll
// ============================================================

// Проверка "залежалости" задачи: более 30 дней без обновлений
const isTaskOld = (updatedAt) => {
    if (!updatedAt) return false;
    const lastUpdate = new Date(updatedAt);
    const diffTime = Math.abs(new Date() - lastUpdate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
};

// Проверка просрочки дедлайна
const isOverdue = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
};

// Форматирование даты в ru-RU (дд.мм.гггг)
const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Умный прогресс-бар: процент от start_at до deadline_at
const getTaskProgress = (task) => {
    if (!task.start_at || !task.deadline_at) return null;

    const start = new Date(task.start_at).getTime();
    const end = new Date(task.deadline_at).getTime();
    const now = new Date().getTime();

    if (now < start) return 0; // Задача еще не началась
    if (now > end) return 100; // Срок полностью истек

    const total = end - start;
    const elapsed = now - start;

    return Math.round((elapsed / total) * 100);
};

// Drag-to-Scroll: стейты
const scrollContainer = ref(null);
let isDown = false;
let startX;
let scrollLeftPos;

const startDragging = (e) => {
    // Не перехватываем drag, если кликнули по кнопке, инпуту или drag-ручке
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('a')) return;
    isDown = true;
    scrollContainer.value?.classList.add('active-dragging');
    startX = e.pageX - scrollContainer.value.offsetLeft;
    scrollLeftPos = scrollContainer.value.scrollLeft;
};

const stopDragging = () => {
    isDown = false;
    scrollContainer.value?.classList.remove('active-dragging');
};

const doDragging = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollContainer.value.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainer.value.scrollLeft = scrollLeftPos - walk;
};

// Индикатор горизонтального скролла (для мобильных)
const scrollPercent = ref(0);
const handleTableScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    const totalScrollable = scrollWidth - clientWidth;
    if (totalScrollable > 0) {
        scrollPercent.value = (scrollLeft / totalScrollable) * 100;
    }
};
</script>
<template>
    <Layout>
        <!-- <pre>

            {{ debug }}
        </pre> -->
        <BModal v-model="chatOpened" fullscreen hide-footer :title="'Обсуждение: ' + activeTask?.name">
            <TaskComments v-if="chatOpened" :task="activeTask"  @close="chatOpened = false" />
        </BModal>
        <BModal v-model="showForm" @close="showForm = false, whenCloseForm()" @hide="whenCloseForm()" title="Добавить участников" body-class="p-4"
        header-class="p-3 bg-info-subtle" hide-footer class="v-modal-custom" centered>
            <AddUserTeamInProject v-if="!isLoading" :myTeams="myTeams" :project_roles="project_roles" :projectHash="project.hash"  />
        </BModal>
        <BModal v-model="showFormAddTask" @close="showFormAddTask = false" title="Добавить задачу" body-class="p-4"
        header-class="p-3 bg-info-subtle" hide-footer class="v-modal-custom" centered>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <input v-model="taskForm.name" type="text" class="form-control" id="project-title-input" placeholder="Название задачи">
                                    </div>
                                    <div class="mb-3">
                                        <textarea v-model="taskForm.description" class="form-control" minlength="50" maxlength="225" rows="3" placeholder="Описание до 225 символов."></textarea>
                                    </div>
                                    <div v-if="project.owner_id === $page.props.auth.user.id" class="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                        <p class="card-text"><small class="text-muted">Уведомление получат привязанные к проекту участники</small></p>
                                        <div class="flex flex-wrap gap-2 mt-1">

                                            <span v-for="m in project.members" :key="'m'+m.id" class="bg-blue-100 px-2 py-1 rounded">
                                                👤 {{ m.name }}
                                            </span>
                                            <div v-for="team in project.teams" :key="'t'+team.id" class="contents">
                                                <span v-for="tm in team.members" :key="'tm'+tm.id" class="bg-green-100 px-2 py-1 rounded">
                                                    👥 {{ tm.name }} ({{ team.name }})
                                                </span>
                                            </div>

                                        </div>
                                    </div>
                                    <div class="add_button">
                                        <BButton type="button" @click="createTask(), showFormAddTask = false" variant="soft-success" size="sm">
                                            <i class="ri-add-line align-bottom"></i> Создать
                                        </BButton>
                                    </div>
                                </div>
        </BModal>

        <BModal v-model="showModal" @close="showModal = false" title="Добавить участников" body-class="p-4"
        header-class="p-3 bg-info-subtle" hide-footer class="v-modal-custom" centered>
            <AddUsersInTask v-if="currentTask" :task="currentTask", :projectHash="project.hash" />
        </BModal>

        <TopLinksInPage :list="crumbs" active="projects_list" />

        <div style="width: 100%; height: 20px;"></div>
        <div class="row">
            <div class="col-12">
                <div class="page-title-box d-sm-flex align-items-center justify-content-between bg-galaxy-transparent">

                    <div class="page-title-right">
                        <ol class="breadcrumb m-0">
                            <!-- Ссылка на список всех проектов -->
                            <li class="breadcrumb-item">
                                <Link  class="link-dark" :href="route('projects_list')"><i class="ri-folders-line me-1"></i>Проекты</Link>
                            </li>
                            <!-- Текущий проект (активный пункт) -->
                            <li class="breadcrumb-item active">
                                <i class="ri-folder-open-line me-1"></i>{{ project.name }}
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
        <div style="width: 100%; height: 30px;"></div>
        <!-- Новая панель информации о проекте -->
        <BRow>
            <BCol lg="12">
                <div class="card border-0 shadow-sm mb-4 bg-white rounded-3 overflow-hidden">
                    <div class="card-body p-4">
                        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">

                            <!-- Левая часть: Крупная иконка, название проекта и описание -->
                            <div class="d-flex align-items-start gap-3 flex-grow-1 min-w-0">
                                <div class="project-icon-box bg-soft-primary text-primary rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm overflow-hidden">
                                    <img v-if="project.cover_thumb_url && project.cover_thumb_url !== '/assets/images/default-project.png'" :src="project.cover_thumb_url" class="w-100 h-100 object-fit-cover" alt="" />
                                    <span v-else class="fs-28 fw-bold text-uppercase">{{ project.name?.charAt(0) || 'P' }}</span>
                                </div>
                                <div class="min-w-0">
                                    <h4 class="fw-semibold text-dark mb-1.5 d-flex align-items-center flex-wrap gap-2">
                                        <span class="text-truncate">{{ project.name }}</span>
                                        <span class="badge bg-soft-success text-success fs-11 py-1 px-2.5 rounded-pill fw-medium">Активный</span>
                                    </h4>
                                    <!-- Текст описания проекта с ограничением максимальной ширины -->
                                    <p class="text-muted fs-13 mb-0 max-w-project-desc">
                                        {{ project.description || 'Описание проекта отсутствует. Нажмите «Редактировать», чтобы добавить краткую информацию о целях и задачах.' }}
                                    </p>
                                </div>
                            </div>

                            <!-- Правая часть: Метаданные (Автор и Создан), разделенные линией -->
                            <div class="d-flex align-items-center gap-4 border-start ps-md-4 project-meta-block flex-shrink-0">
                                <!-- Блок Владельца/Автора -->
                                <div class="meta-item-box text-center text-md-start">
                                    <span class="fs-11 text-muted text-uppercase fw-semibold d-block mb-1.5 tracking-wider">Владелец</span>
                                    <div class="d-flex align-items-center gap-2">
                                        <img v-if="project.owner?.profile_photo_micro_url" :src="project.owner.profile_photo_micro_url" class="avatar-xxs rounded-circle border border-white shadow-sm" alt="" />
                                        <div v-else class="avatar-xxs bg-light rounded-circle text-primary fw-bold fs-10 d-flex align-items-center justify-content-center border border-white shadow-sm">
                                            {{ project.owner?.name ? project.owner.name.charAt(0) : 'U' }}
                                        </div>
                                        <span class="fs-13 fw-semibold text-dark text-nowrap">{{ project.owner?.name || 'Не указан' }}</span>
                                    </div>
                                </div>

                                <!-- Блок Даты создания -->
                                <div class="meta-item-box text-center text-md-start border-start-dash ps-3">
                                    <span class="fs-11 text-muted text-uppercase fw-semibold d-block mb-1.5 tracking-wider">Создан</span>
                                    <span class="fs-13 fw-semibold text-dark text-nowrap">
                                        <i class="ri-calendar-line text-muted me-1 align-middle fs-14"></i>
                                        {{ formatDate(project.created_at) }}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </BCol>
        </BRow>

        <BRow class="mb-4">
            <BCol lg="12">
                <BTabs v-model="activeTab" nav-class="nav-tabs-custom border-bottom-0">
                    <BTab title="Задачи" active class="fw-semibold pt-2">

                        <BRow>
                            <div ref="tasksTableRef" class="card">
                                <!-- Верхняя панель -->
                                <div class="card-header align-items-center d-flex flex-wrap gap-2">
                                    <div class="d-flex align-items-center gap-2">
                                        <h4 class="card-title mb-0 flex-grow-1">{{ $t('t-tasks_in_project') }}</h4>
                                        <span class="badge bg-soft-primary text-primary">{{ tasks.total || 0 }}</span>
                                    </div>
                                    <div class="d-flex align-items-center gap-2 ms-auto">
                                        <div class="scroll-indicator-wrapper d-md-none">
                                            <div class="scroll-indicator-bar" :style="{ width: scrollPercent + '%' }"></div>
                                        </div>
                                        <BButton v-if="canAddTasks" class="d-inline-flex align-items-center" @click="showFormAddTask = true" variant="soft-success" size="sm"><i class="ri-add-line align-bottom me-1"></i> Добавить</BButton>
                                    </div>
                                </div>

                                <div class="card-body p-0">
                                    <!-- Компактное и стильное предупреждение о публикации -->
                                    <div class="alert alert-soft-warning border-0 d-flex align-items-center p-2.5 mb-3 fs-12 rounded-3 shadow-sm mx-3 mt-3">
                                        <div class="d-flex align-items-center gap-2 text-dark">
                                            <i class="ri-alert-fill fs-16 text-warning"></i>
                                            <span><strong>Статус публикации:</strong> Снятие задачи с публикации скроет её из рабочих пространств всех участников.</span>
                                        </div>
                                    </div>

                                    <!-- Таблица с drag-to-scroll и кастомным скроллбаром -->
                                    <div
                                        class="table-responsive custom-scrollbar position-relative"
                                        ref="scrollContainer"
                                        @mousedown="startDragging"
                                        @mousemove="doDragging"
                                        @mouseup="stopDragging"
                                        @mouseleave="stopDragging"
                                        @scroll="handleTableScroll"
                                    >
                                        <table v-if="tasks.data.length > 0" class="table align-middle table-nowrap table-hover mb-0">
                                            <thead class="table-light text-uppercase fs-11 text-muted">
                                                <tr>
                                                    <th scope="col" class="p-3 sticky-col" style="width: 80px;">Прогресс</th>
                                                    <th scope="col" class="sticky-col-name">Название</th>
                                                    <th scope="col">Участники</th>
                                                    <th scope="col">Создана</th>
                                                    <th scope="col">Статус</th>
                                                    <th scope="col">Приоритет</th>
                                                    <th scope="col" class="text-end p-3">Действия</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr
                                                    v-for="task in tasks.data"
                                                    :key="task.id"
                                                    class="task-row-transition"
                                                    :class="{ 'task-faded': isTaskOld(task.updated_at) }"
                                                    v-b-tooltip.hover :title="task.description"
                                                >
                                                    <!-- Прогресс (липкая колонка) -->
                                                    <td class="p-3 sticky-col">
                                                        <!-- Вариант А: Задача еще не стартовала или нет дат -->
                                                        <div v-if="getTaskProgress(task) === null || getTaskProgress(task) === 0" class="text-muted fs-12 d-flex align-items-center gap-1">
                                                            <i class="ri-time-line text-warning fs-15"></i> В очереди
                                                        </div>
                                                        <!-- Вариант Б: Задача в процессе выполнения -->
                                                        <div v-else class="d-flex align-items-center gap-2" style="min-width: 120px;">
                                                            <div class="progress flex-grow-1 bg-soft-primary" style="height: 6px;">
                                                                <div
                                                                    class="progress-bar bg-primary rounded"
                                                                    role="progressbar"
                                                                    :style="{ width: getTaskProgress(task) + '%' }"
                                                                    :aria-valuenow="getTaskProgress(task)"
                                                                    aria-valuemin="0"
                                                                    aria-valuemax="100"
                                                                ></div>
                                                            </div>
                                                            <span class="fs-11 fw-medium text-muted">{{ getTaskProgress(task) }}%</span>
                                                        </div>
                                                    </td>

                                                    <!-- Название (липкая колонка) -->
                                                    <td class="sticky-col-name">
                                                        <div class="max-w-task-title">
                                                            <a href="#" @click.prevent="openTask(task.hash)" class="text-body fw-medium task-title-hover">
                                                                {{ task.name }}
                                                            </a>
                                                            <span v-if="isTaskOld(task.updated_at)" class="ms-2 text-warning fs-11" title="Задача долго не обновлялась">
                                                                <i class="ri-hourglass-2-fill"></i>
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <!-- Участники: перекрывающиеся аватарки -->
                                                    <td>
                                                        <div class="avatar-group flex-nowrap">
                                                            <template v-for="member in task.all_participants.slice(0, 4)" :key="member.name">
                                                                <BLink
                                                                    class="avatar-group-item position-relative"
                                                                    v-b-tooltip.hover
                                                                    :title="member.is_pending ? 'Приглашён ' + member.name : 'Участвует ' + member.name"
                                                                    :class="member.is_pending ? 'opacity-50' : ''"
                                                                >
                                                                    <img v-if="member.avatar" :src="member.avatar" class="rounded-circle avatar-xxs" alt="" />
                                                                    <img v-else-if="member.avatar_path" :src="member.avatar_path" class="rounded-circle avatar-xxs" alt="" />
                                                                    <div
                                                                        v-else
                                                                        class="avatar-xxs rounded-circle d-flex align-items-center justify-content-center fs-10 fw-bold"
                                                                        :class="`bg-${getTeamColor(member.name)}-subtle text-${getTeamColor(member.name)}`"
                                                                    >
                                                                        {{ member.name.charAt(0).toUpperCase() }}
                                                                    </div>
                                                                </BLink>
                                                            </template>
                                                            <div v-if="task.all_participants.length > 4" class="avatar-group-item">
                                                                <div
                                                                    class="avatar-xxs rounded-circle bg-light text-muted d-flex align-items-center justify-content-center fs-10 fw-medium border border-white"
                                                                    v-b-tooltip.hover
                                                                    :title="'и еще ' + (task.all_participants.length - 4) + ' участников'"
                                                                >
                                                                    +{{ task.all_participants.length - 4 }}
                                                                </div>
                                                            </div>
                                                            <span v-if="!task.all_participants?.length" class="text-muted fs-12">—</span>
                                                            <button @click.stop="currentTask = task, showModal = true" v-if="canManageMembers"
                                                                v-b-tooltip.hover title="Добавить пользователя"
                                                                class="btn p-0 border-0 bg-transparent"
                                                            >
                                                                <div class="avatar-xxs rounded-circle bg-light border-dashed border text-primary d-flex align-items-center justify-content-center fs-10 fw-bold">
                                                                    +
                                                                </div>
                                                            </button>
                                                        </div>
                                                        <div v-if="task.has_active_invitations" class="mt-1">
                                                            <small class="text-muted">и {{ task.invitations_count }} приглашено</small>
                                                        </div>
                                                    </td>

                                                    <!-- Сроки -->
                                                    <td>
                                                        <span class="fs-13 text-body">{{ formatDate(task.created_at) }}</span>
                                                    </td>

                                                    <!-- Статус (badge-outline + BDropdown) -->
                                                    <td>
                                                        <BDropdown :disabled="!canChangeStatus" variant="link" class="p-0 border-0 no-caret" toggle-class="text-decoration-none p-0">
                                                            <template #button-content>
                                                                <span
                                                                    class="badge-outline-custom status-badge"
                                                                    :style="{ borderColor: task.status?.color, color: task.status?.color }"
                                                                >
                                                                    <span class="status-circle-dot" :style="{ backgroundColor: task.status?.color }"></span>
                                                                    {{ task.status?.name || 'Без статуса' }}
                                                                </span>
                                                            </template>
                                                            <BDropdownItem
                                                                v-if="canChangeStatus"
                                                                v-for="status in project.available_statuses"
                                                                :key="status.id"
                                                                @click="updateTaskStatus(task, status)"
                                                                :active="task.status_id === status.id"
                                                            >
                                                                <div class="d-flex align-items-center">
                                                                    <div :style="{ backgroundColor: status.color }" class="rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                                    <span>{{ status.name }}</span>
                                                                </div>
                                                            </BDropdownItem>
                                                        </BDropdown>
                                                    </td>

                                                    <!-- Приоритет (badge-outline + BDropdown) -->
                                                    <td>
                                                        <BDropdown variant="link" class="p-0 border-0 no-caret" toggle-class="text-decoration-none p-0">
                                                            <template #button-content>
                                                                <span
                                                                    class="badge-outline-custom text-uppercase fs-10 px-2 py-1"
                                                                    :class="{
                                                                        'priority-high': task.priority === 'high',
                                                                        'priority-medium': task.priority === 'medium',
                                                                        'priority-low': task.priority === 'low'
                                                                    }"
                                                                >
                                                                    {{ getPriorityLabel(task.priority) }}
                                                                </span>
                                                            </template>
                                                            <BDropdownItem
                                                                v-for="opt in priority_options"
                                                                :key="opt.value"
                                                                @click="updatePriority(task, opt.value)"
                                                                :active="task.priority === opt.value"
                                                            >
                                                                <div class="d-flex align-items-center">
                                                                    <div :style="{ backgroundColor: getHexColor(opt.color) }"
                                                                        class="rounded-circle me-2"
                                                                        style="width: 8px; height: 8px; flex-shrink: 0;">
                                                                    </div>
                                                                    <span>{{ opt.label }}</span>
                                                                </div>
                                                            </BDropdownItem>
                                                        </BDropdown>
                                                    </td>

                                                    <!-- Действия -->
                                                    <td class="p-3 text-end" style="width: 140px;">
                                                        <div class="d-flex align-items-center justify-content-end gap-2 actions-container">
                                                            <!-- Кнопка Публикации: иконка-глаз вместо тумблера -->
                                                            <button
                                                                class="btn btn-icon btn-sm rounded-circle waves-effect waves-light transition-all"
                                                                :class="task.published ? 'btn-soft-success' : 'btn-soft-danger'"
                                                                @click="router.patch(route('tasks.publish.toggle', task.hash), {}, { preserveScroll: true })"
                                                                v-b-tooltip.hover
                                                                :title="task.published ? 'Опубликовано (нажмите, чтобы скрыть)' : 'Черновик (нажмите, чтобы опубликовать)'"
                                                            >
                                                                <i :class="task.published ? 'ri-eye-fill fs-14' : 'ri-eye-off-fill fs-14'"></i>
                                                            </button>

                                                            <!-- Сгруппированный блок быстрых действий -->
                                                            <div class="btn-group btn-group-sm border border-light-subtle rounded-2 bg-white shadow-sm overflow-hidden">
                                                                <button
                                                                    class="btn btn-link text-muted px-2.5 py-1.5 border-end border-light-subtle no-decor-btn"
                                                                    @click="openChat(task)"
                                                                    title="Обсуждение"
                                                                >
                                                                    <i class="ri-chat-3-line fs-13"></i>
                                                                </button>
                                                                <button
                                                                    class="btn btn-link text-muted px-2.5 py-1.5 no-decor-btn"
                                                                    @click="deleteTask(task)"
                                                                    title="Удалить"
                                                                >
                                                                    <i class="ri-delete-bin-line fs-13"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div v-else class="text-center py-5 text-muted">
                                            <i class="ri-task-line fs-24 d-block mb-2 opacity-50"></i>
                                            <span class="fs-13">Задач нет</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </BRow>

                        <BRow v-if="totalPages > 1" class="g-0 text-center text-sm-start align-items-center mt-3">
                            <BCol sm="6">
                                <div>
                                    <p class="mb-sm-0">Показано с {{ tasks.from }} по {{ tasks.to }} из {{ tasks.total }} задач</p>
                                </div>
                            </BCol>
                            <BCol sm="6">
                                <ul class="pagination pagination-separated justify-content-center justify-content-sm-end mb-sm-0">
                                    <li
                                        class="page-item"
                                        :class="{ 'disabled': tasks.current_page === 1 }"
                                    >
                                        <BLink
                                            class="page-link cursor-pointer"
                                            @click.prevent="goToPage(tasks.current_page - 1)"
                                        >
                                            <span v-if="loadingPage === tasks.current_page - 1" class="spinner-border spinner-border-sm" role="status"></span>
                                            <span v-else><i class="mdi mdi-chevron-left"></i></span>
                                        </BLink>
                                    </li>
                                    <template v-for="(entry, idx) in visiblePages" :key="'p-' + idx">
                                        <li
                                            v-if="entry === '...'"
                                            class="page-item disabled"
                                        >
                                            <span class="page-link">…</span>
                                        </li>
                                        <li
                                            v-else
                                            class="page-item"
                                            :class="{ 'active': tasks.current_page === entry }"
                                        >
                                            <BLink
                                                class="page-link cursor-pointer"
                                                @click.prevent="goToPage(entry)"
                                            >
                                                <span v-if="loadingPage === entry" class="spinner-border spinner-border-sm" role="status"></span>
                                                <span v-else>{{ entry }}</span>
                                            </BLink>
                                        </li>
                                    </template>
                                    <li
                                        class="page-item"
                                        :class="{ 'disabled': tasks.current_page === totalPages }"
                                    >
                                        <BLink
                                            class="page-link cursor-pointer"
                                            @click.prevent="goToPage(tasks.current_page + 1)"
                                        >
                                            <span v-if="loadingPage === tasks.current_page + 1" class="spinner-border spinner-border-sm" role="status"></span>
                                            <span v-else><i class="mdi mdi-chevron-right"></i></span>
                                        </BLink>
                                    </li>
                                </ul>
                            </BCol>
                        </BRow>
                    </BTab>
                    <BTab class="fw-semibold pt-2">
                        <template #title>
                            <span @click="kanbanLoaded = true">Канбан</span>
                        </template>
                        <div v-if="kanbanLoaded" class="kanban-tab-wrapper">
                            <KanbanBoard
                                :project-hash="project.hash"
                                :current-user-id="$page.props.auth.user.id"
                                :can-change-status="canChangeStatus"
                                :available-statuses="project.available_statuses"
                                :initial-board-id="kanbanBoardId"
                            />
                        </div>
                        <div v-else class="text-center py-5 text-muted">
                            <i class="ri-layout-kanban-line fs-24 d-block mb-2 opacity-50"></i>
                            <span class="fs-13">Нажмите на вкладку «Канбан», чтобы загрузить доски</span>
                        </div>
                    </BTab>
                    <BTab class="fw-semibold pt-2">
                        <template #title>
                            <span @click="flowsLoaded = true">Блок-схемы</span>
                        </template>
                        <div v-if="flowsLoaded" class="flows-tab-wrapper">
                            <FlowsTab
                                :project-hash="project.hash"
                                :project-statuses="projectStatuses"
                                :project-members="projectMembers"
                            />
                        </div>
                        <div v-else class="text-center py-5 text-muted">
                            <i class="ri-node-tree fs-24 d-block mb-2 opacity-50"></i>
                            <span class="fs-13">Нажмите на вкладку «Блок-схемы», чтобы загрузить</span>
                        </div>
                        <!-- <BCard no-body>
                            <BCardBody>
                                <h5 class="card-title">Последние действия</h5>
                                <div class="acitivity-timeline py-3">
                                    <div class="acitivity-item d-flex">
                                        <div class="flex-shrink-0">
                                            <img src="@assets/images/users/avatar-1.jpg" alt=""
                                                class="avatar-xs rounded-circle acitivity-avatar" />
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">Oliver Phillips <BBadge variant="primary-subtle"
                                                    class="bg-primary-subtle text-primary align-middle">New</BBadge>
                                            </h6>
                                            <p class="text-muted mb-2">We talked about a project on linkedin.</p>
                                            <small class="mb-0 text-muted">Today</small>
                                        </div>
                                    </div>
                                    <div class="acitivity-item py-3 d-flex">
                                        <div class="flex-shrink-0 avatar-xs acitivity-avatar">
                                            <div class="avatar-title bg-success-subtle text-success rounded-circle">
                                                N
                                            </div>
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">Nancy Martino <BBadge variant="secondary-subtle"
                                                    class="bg-secondary-subtle text-secondary align-middle">In
                                                    Progress</BBadge>
                                            </h6>
                                            <p class="text-muted mb-2"><i class="ri-file-text-line align-middle ms-2"></i>
                                                Create new project
                                                Building product</p>
                                            <div class="avatar-group mb-2">
                                                <BLink href="javascript: void(0);" class="avatar-group-item"
                                                    data-bs-toggle="tooltip" data-bs-placement="top" title=""
                                                    data-bs-original-title="Christi">
                                                    <img src="@assets/images/users/avatar-4.jpg" alt=""
                                                        class="rounded-circle avatar-xs" />
                                                </BLink>
                                                <BLink href="javascript: void(0);" class="avatar-group-item"
                                                    data-bs-toggle="tooltip" data-bs-placement="top" title=""
                                                    data-bs-original-title="Frank Hook">
                                                    <img src="@assets/images/users/avatar-3.jpg" alt=""
                                                        class="rounded-circle avatar-xs" />
                                                </BLink>
                                                <BLink href="javascript: void(0);" class="avatar-group-item"
                                                    data-bs-toggle="tooltip" data-bs-placement="top" title=""
                                                    data-bs-original-title=" Ruby">
                                                    <div class="avatar-xs">
                                                        <div class="avatar-title rounded-circle bg-light text-primary">
                                                            R
                                                        </div>
                                                    </div>
                                                </BLink>
                                                <BLink href="javascript: void(0);" class="avatar-group-item"
                                                    data-bs-toggle="tooltip" data-bs-placement="top" title=""
                                                    data-bs-original-title="more">
                                                    <div class="avatar-xs">
                                                        <div class="avatar-title rounded-circle">
                                                            2+
                                                        </div>
                                                    </div>
                                                </BLink>
                                            </div>
                                            <small class="mb-0 text-muted">Yesterday</small>
                                        </div>
                                    </div>
                                    <div class="acitivity-item py-3 d-flex">
                                        <div class="flex-shrink-0">
                                            <img src="@assets/images/users/avatar-2.jpg" alt=""
                                                class="avatar-xs rounded-circle acitivity-avatar" />
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">Natasha Carey <BBadge variant="success-subtle"
                                                    class="bg-success-subtle text-success align-middle">Completed</BBadge>
                                            </h6>
                                            <p class="text-muted mb-2">Adding a new event with attachments</p>
                                            <BRow>
                                                <BCol xxl="4">
                                                    <BRow class="border border-dashed gx-2 p-2 mb-2">
                                                        <BCol cols="4">
                                                            <img src="@assets/images/small/img-2.jpg" alt=""
                                                                class="img-fluid rounded" />
                                                        </BCol>
                                                        <BCol cols="4">
                                                            <img src="@assets/images/small/img-3.jpg" alt=""
                                                                class="img-fluid rounded" />
                                                        </BCol>
                                                        <BCol cols="4">
                                                            <img src="@assets/images/small/img-4.jpg" alt=""
                                                                class="img-fluid rounded" />
                                                        </BCol>
                                                    </BRow>
                                                </BCol>
                                            </BRow>
                                            <small class="mb-0 text-muted">25 Nov</small>
                                        </div>
                                    </div>
                                    <div class="acitivity-item py-3 d-flex">
                                        <div class="flex-shrink-0">
                                            <img src="@assets/images/users/avatar-6.jpg" alt=""
                                                class="avatar-xs rounded-circle acitivity-avatar" />
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">Bethany Johnson</h6>
                                            <p class="text-muted mb-2">added a new member to velzon dashboard</p>
                                            <small class="mb-0 text-muted">19 Nov</small>
                                        </div>
                                    </div>
                                    <div class="acitivity-item py-3 d-flex">
                                        <div class="flex-shrink-0">
                                            <div class="avatar-xs acitivity-avatar">
                                                <div class="avatar-title rounded-circle bg-danger-subtle text-danger">
                                                    <i class="ri-shopping-bag-line"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">Your order is placed <BBadge variant="danger-subtle"
                                                    class="bg-danger-subtle text-danger align-middle ms-1">Out of
                                                    Delivery</BBadge>
                                            </h6>
                                            <p class="text-muted mb-2">These customers can rest assured their order has
                                                been placed.</p>
                                            <small class="mb-0 text-muted">16 Nov</small>
                                        </div>
                                    </div>
                                    <div class="acitivity-item py-3 d-flex">
                                        <div class="flex-shrink-0">
                                            <img src="@assets/images/users/avatar-7.jpg" alt=""
                                                class="avatar-xs rounded-circle acitivity-avatar" />
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">Lewis Pratt</h6>
                                            <p class="text-muted mb-2">They all have something to say beyond the words
                                                on the page. They can come across as casual or neutral, exotic or
                                                graphic. </p>
                                            <small class="mb-0 text-muted">22 Oct</small>
                                        </div>
                                    </div>
                                    <div class="acitivity-item py-3 d-flex">
                                        <div class="flex-shrink-0">
                                            <div class="avatar-xs acitivity-avatar">
                                                <div class="avatar-title rounded-circle bg-info-subtle text-info">
                                                    <i class="ri-line-chart-line"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">Monthly sales report</h6>
                                            <p class="text-muted mb-2"><span class="text-danger">2 days left</span>
                                                notification to submit the monthly sales report. <BLink
                                                    href="javascript:void(0);"
                                                    class="link-warning text-decoration-underline">Reports Builder
                                                </BLink>
                                            </p>
                                            <small class="mb-0 text-muted">15 Oct</small>
                                        </div>
                                    </div>
                                    <div class="acitivity-item d-flex">
                                        <div class="flex-shrink-0">
                                            <img src="@assets/images/users/avatar-8.jpg" alt=""
                                                class="avatar-xs rounded-circle acitivity-avatar" />
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">New ticket received <BBadge variant="success-subtle"
                                                    class="bg-success-subtle text-success align-middle">Completed</BBadge>
                                            </h6>
                                            <p class="text-muted mb-2">User <span class="text-secondary">Erica245</span>
                                                submitted a ticket.</p>
                                            <small class="mb-0 text-muted">26 Aug</small>
                                        </div>
                                    </div>
                                </div>
                            </BCardBody>
                        </BCard> -->
                    </BTab>
                    <BTab title="Активность" class="fw-semibold pt-2">
                        <BCard no-body>
                            <BCardBody>
                                <h5 class="card-title">Последние действия</h5>
                                <div v-if="activitiesLoading" class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Загрузка...</span>
                                    </div>
                                </div>
                                <div v-else-if="activities.length === 0" class="text-center py-4 text-muted">
                                    Активности пока нет
                                </div>
                                <div v-else class="acitivity-timeline py-3">
                                    <div class="acitivity-item d-flex" v-for="(activity, index) of activities" :key="index">
                                        <div class="flex-shrink-0" v-if="activity.user.avatar">
                                            <img :src="activity.user.avatar" alt=""
                                                class="avatar-xs rounded-circle acitivity-avatar" />
                                        </div>
                                        <div
                                            v-else class="rounded-circle avatar-xs"
                                            :class="`bg-${getTeamColor(activity.user.name)}-subtle text-${getTeamColor(activity.user.name)}`"
                                            style="display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;"
                                        >
                                            {{ activity.user.name.charAt(0).toUpperCase() }}
                                        </div>
                                        <div class="flex-grow-1 ms-3">
                                            <h6 class="mb-1">{{ activity.user.name }}</h6>
                                            <p class="text-muted mb-2">{{ activity.description }} <span
                                                    class="badge align-middle"
                                                    :style="activity.color.includes('#')
                                                        ? {
                                                            backgroundColor: activity.color + '20',
                                                            color: activity.color,
                                                            border: '1px solid ' + activity.color + '40'
                                                        }
                                                        : null"
                                                    :class="!activity.color.includes('#') ? `bg-${activity.color}-subtle text-${activity.color}` : ''"
                                                >
                                                    {{ activity.label }}
                                                </span> в <BLink @click="openTask(activity.task.hash)" class="link-primary">{{ activity.task.title }}</BLink></p>
                                                <div v-if="activity.attachments" class="row box_files">
                                                            <div class="row border border-dashed gx-2 p-2 mb-2">
                                                                <template v-for="file in activity.attachments" :key="file.id">
                                                                    <div v-if="file.info.is_image" class="col-4 mt-2">
                                                                        <img :src="file.preview" alt="" class="img-fluid rounded">
                                                                    </div>
                                                                    <div v-else class="col-4 mt-2">
                                                                            <div :class="`bg-soft-${file.info.color} text-${file.info.color} rounded`" style="font-size: 28px;">
                                                                                <i :class="file.info.icon"></i>
                                                                            </div>
                                                                            <a :href="file.url" target="_blank" style="font-size: 10px;" class="text-dark d-block lh-1">{{ file.name }}</a>
                                                                    </div>
                                                                </template>
                                                            </div>
                                                </div>
                                            <small class="mb-0 text-muted">{{ activity.created_at_human }}</small>
                                        </div>
                                    </div>
                                </div>
                            </BCardBody>
                        </BCard>
                    </BTab>
                    <BTab class="fw-semibold pt-2">
                        <template #title>
                            <span @click="backlogLoaded = true">
                                <i class="ri-lightbulb-line me-1 text-warning"></i> Бэклог
                            </span>
                        </template>
                        <div v-if="backlogLoaded" class="backlog-tab-wrapper">
                            <BacklogTab
                                :project-hash="project.hash"
                                :can-add-tasks="canAddTasks"
                            />
                        </div>
                        <div v-else class="text-center py-5 text-muted">
                            <i class="ri-lightbulb-line fs-24 d-block mb-2 opacity-50"></i>
                            <span class="fs-13">Нажмите на вкладку «Бэклог», чтобы загрузить</span>
                        </div>
                    </BTab>
                    <BTab v-if="project.owner_id === $page.props.auth.user.id" title="Настройки" class="fw-semibold pt-2">
                        <BCard title="Настройки проекта">
                        <form @submit.prevent="updateProject">
                            <!-- Поле названия -->
                            <div class="mb-3">
                                <label class="form-label">Название проекта</label>
                                <input v-model="formUpdate.name" type="text" class="form-control" :class="{'is-invalid': formUpdate.errors.name}">
                            </div>

                            <!-- Поле описания -->
                            <div class="mb-3">
                                <label class="form-label">Описание</label>
                                <textarea maxlength="255" v-model="formUpdate.description" class="form-control" rows="3"></textarea>
                            </div>
                            <div v-if="formUpdate.errors.description" class="invalid-feedback">
                                {{ formUpdate.errors.description }}
                            </div>
                            <!-- Загрузка обложки -->
                            <div class="mb-3">
                                <label class="form-label">Обложка проекта</label>
                                <div class="d-flex align-items-center gap-3">
                                    <!-- Теперь src привязан к photoPreview -->
                                    <img :src="photoPreview || '/assets/images/default-project.png'"
                                        class="rounded avatar-lg object-cover"
                                        style="width: 100px; height: 100px; object-fit: cover;" />

                                    <input type="file" @change="previewImage" class="form-control" accept="image/*">
                                </div>
                            </div>

                            <BButton type="submit" variant="primary" :disabled="form.processing">
                                {{ formUpdate.processing ? 'Сохранение...' : 'Обновить проект' }}
                            </BButton>
                        </form>
                        </BCard>
                        <BCard title="Статусы задач">
                            <BRow>
                                    <!-- Левая колонка: Список статусов -->
                                    <BCol lg="7">
                                        <BCard no-body>
                                            <BCardBody>
                                                <div class="table-responsive">
                                                    <table class="table table-borderless align-middle mb-0">
                                                        <thead class="table-light text-muted">
                                                            <tr>
                                                                <th scope="col">Сортировка</th>
                                                                <th scope="col">Цвет</th>
                                                                <th scope="col">Название</th>
                                                                <th scope="col">Уровень</th>
                                                                <th scope="col" class="text-end">Действия</th>
                                                            </tr>
                                                        </thead>
                                                        <VueDraggableNext
                                                                    v-model="localStatuses"
                                                                    tag="tbody"
                                                                    handle=".drag-handle"
                                                                    @end="onDragEnd"
                                                                    :animation="200"
                                                                    ghost-class="ghost"
                                                                >
                                                                    <tr v-for="element in localStatuses" :key="element.id"
                                                                        :class="{'table-info': editingStatusId === element.id}">

                                                                        <!-- 1. Ручка для перетаскивания -->
                                                                        <td>
                                                                            <div class="drag-handle" style="cursor: move;">
                                                                                <i class="ri-drag-move-fill text-muted fs-18"></i>
                                                                            </div>
                                                                        </td>

                                                                        <!-- 2. Отображение цвета -->
                                                                        <td>
                                                                            <div :style="{ backgroundColor: element.color }"
                                                                                class="rounded border shadow-sm"
                                                                                style="width: 24px; height: 24px;">
                                                                            </div>
                                                                        </td>

                                                                        <!-- 3. Название статуса -->
                                                                        <td>
                                                                            <span class="fw-medium">{{ element.name }}</span>
                                                                        </td>

                                                                        <!-- 4. Бейдж области (Проект/Общий) -->
                                                                        <td>
                                                                            <span v-if="element.project_id" class="badge bg-primary-subtle text-primary">
                                                                                <i class="ri-folder-2-line me-1"></i> Проектный
                                                                            </span>
                                                                            <span v-else class="badge bg-success-subtle text-success">
                                                                                <i class="ri-global-line me-1"></i> Общий
                                                                            </span>
                                                                        </td>

                                                                        <!-- 5. Кнопки управления -->
                                                                        <td class="text-end">
                                                                            <div class="hstack gap-2 justify-content-end">
                                                                                <button type="button" @click="editStatus(element)"
                                                                                        class="btn btn-soft-info btn-sm" v-b-tooltip.hover title="Изменить">
                                                                                    <i class="ri-edit-2-line"></i>
                                                                                </button>
                                                                                <button type="button" @click="deleteStatus(element.id)"
                                                                                        class="btn btn-soft-danger btn-sm" v-b-tooltip.hover title="Удалить">
                                                                                    <i class="ri-delete-bin-line"></i>
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </VueDraggableNext>
                                                    </table>
                                                </div>
                                            </BCardBody>
                                        </BCard>
                                    </BCol>

                                    <!-- Правая колонка: Форма -->
                                    <BCol lg="5">
                                        <BCard no-body>
                                            <BCardHeader>
                                                <h4 class="card-title mb-0">{{ editingStatusId ? 'Редактировать статус' : 'Добавить новый статус' }}</h4>
                                            </BCardHeader>
                                            <BCardBody>
                                                <form @submit.prevent="saveStatus">
                                                    <div class="mb-3">
                                                        <label class="form-label">Название</label>
                                                        <input v-model="statusForm.name" type="text" class="form-control" placeholder="Напр: В тестировании" required>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label class="form-label">Цвет статуса</label>
                                                        <input v-model="statusForm.color" type="color" class="form-control form-control-color w-100" style="height: 40px;">
                                                    </div>
                                                    <div class="mb-3">
                                                        <label class="form-label d-block">Область применения</label>
                                                        <div class="form-check form-check-inline">
                                                            <input class="form-check-input" type="radio" v-model="statusForm.level" value="project" id="lvl1">
                                                            <label class="form-check-label" for="lvl1">Только этот проект</label>
                                                        </div>
                                                        <div class="form-check form-check-inline">
                                                            <input class="form-check-input" type="radio" v-model="statusForm.level" value="all_projects" id="lvl2">
                                                            <label class="form-check-label" for="lvl2">Все мои проекты</label>
                                                        </div>
                                                    </div>
                                                    <div class="hstack gap-2 justify-content-end">
                                                        <button v-if="editingStatusId" type="button" @click="cancelEdit" class="btn btn-light">Отмена</button>
                                                        <button type="submit" class="btn btn-primary" :disabled="statusForm.processing">
                                                            {{ editingStatusId ? 'Сохранить изменения' : 'Создать статус' }}
                                                        </button>
                                                    </div>
                                                </form>
                                            </BCardBody>
                                        </BCard>
                                    </BCol>
                                </BRow>

                        </BCard>
                        <!-- <BRow>
                            <BCol xl="9" lg="8">
                                <BCard no-body>
                                    <BCardBody>
                                        <div class="text-muted">
                                            <h6 class="mb-3 fw-semibold text-uppercase">Summary</h6>
                                            <p>{{ project.description }}</p>

                                            <div class="pt-3 border-top border-top-dashed mt-4">
                                                <BRow gy-3>

                                                    <BCol lg="3" sm="6">
                                                        <div>
                                                            <p class="mb-2 text-uppercase fw-medium">Create Date :</p>
                                                            <h5 class="fs-15 mb-0">15 Sep, 2021</h5>
                                                        </div>
                                                    </BCol>
                                                    <BCol lg="3" sm="6">
                                                        <div>
                                                            <p class="mb-2 text-uppercase fw-medium">Due Date :</p>
                                                            <h5 class="fs-15 mb-0">29 Dec, 2021</h5>
                                                        </div>
                                                    </BCol>
                                                    <BCol lg="3" sm="6">
                                                        <div>
                                                            <p class="mb-2 text-uppercase fw-medium">Priority :</p>
                                                            <BBadge tag="div" class="bg-danger fs-12">High</BBadge>
                                                        </div>
                                                    </BCol>
                                                    <BCol lg="3" sm="6">
                                                        <div>
                                                            <p class="mb-2 text-uppercase fw-medium">Status :</p>
                                                            <BBadge tag="div" class="bg-warning fs-12">Inprogress</BBadge>
                                                        </div>
                                                    </BCol>
                                                </BRow>
                                            </div>

                                            <div class="pt-3 border-top border-top-dashed mt-4">
                                                <h6 class="mb-3 fw-semibold text-uppercase">Resources</h6>
                                                <BRow class="g-3">
                                                    <BCol xxl="4" lg="6">
                                                        <div class="border rounded border-dashed p-2">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-shrink-0 me-3">
                                                                    <div class="avatar-sm">
                                                                        <div
                                                                            class="avatar-title bg-light text-secondary rounded fs-24">
                                                                            <i class="ri-folder-zip-line"></i>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-grow-1 overflow-hidden">
                                                                    <h5 class="fs-13 mb-1">
                                                                        <BLink href="#"
                                                                            class="text-body text-truncate d-block">App
                                                                            pages.zip</BLink>
                                                                    </h5>
                                                                    <div>2.2MB</div>
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <div class="d-flex gap-1">
                                                                        <button type="button"
                                                                            class="btn btn-icon text-muted btn-sm fs-18"><i
                                                                                class="ri-download-2-line"></i></button>
                                                                        <BDropdown variant="link"
                                                                            toggle-class="btn btn-icon btn-sm fs-18 text-muted arrow-none"
                                                                            menu-class="dropdown-menu-end"
                                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                            <template #button-content>
                                                                                <i class="ri-more-fill"></i>
                                                                            </template>
                                                                            <BDropdownItem><i
                                                                                    class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                                Rename </BDropdownItem>
                                                                            <BDropdownItem> <i
                                                                                    class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                                Delete
                                                                            </BDropdownItem>
                                                                        </BDropdown>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </BCol>
                                                    <BCol xxl="4" lg="6">
                                                        <div class="border rounded border-dashed p-2">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-shrink-0 me-3">
                                                                    <div class="avatar-sm">
                                                                        <div
                                                                            class="avatar-title bg-light text-secondary rounded fs-24">
                                                                            <i class="ri-file-ppt-2-line"></i>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-grow-1 overflow-hidden">
                                                                    <h5 class="fs-13 mb-1">
                                                                        <BLink href="#"
                                                                            class="text-body text-truncate d-block">
                                                                            Velzon
                                                                            admin.ppt</BLink>
                                                                    </h5>
                                                                    <div>2.4MB</div>
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <div class="d-flex gap-1">
                                                                        <button type="button"
                                                                            class="btn btn-icon text-muted btn-sm fs-18"><i
                                                                                class="ri-download-2-line"></i></button>
                                                                        <BDropdown variant="link"
                                                                            toggle-class="btn btn-icon btn-sm fs-18 text-muted arrow-none"
                                                                            menu-class="dropdown-menu-end"
                                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                            <template #button-content>
                                                                                <i class="ri-more-fill"></i>
                                                                            </template>
                                                                            <BDropdownItem><i
                                                                                    class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                                Rename </BDropdownItem>
                                                                            <BDropdownItem> <i
                                                                                    class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                                Delete
                                                                            </BDropdownItem>
                                                                        </BDropdown>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </BCol>
                                                </BRow>
                                            </div>
                                        </div>
                                    </BCardBody>
                                </BCard>

                                <BCard no-body>
                                    <BCardHeader class="align-items-center d-flex py-0">
                                        <BCardTitle class="mb-0 flex-grow-1">Comments</BCardTitle>
                                        <div class="flex-shrink-0">
                                            <BDropdown variant="link" class="card-header-dropdown"
                                                toggle-class="text-reset dropdown-btn arrow-none"
                                                menu-class="dropdown-menu-end" aria-haspopup="true">
                                                <template #button-content> <span class="text-muted">Recent<i
                                                            class="mdi mdi-chevron-down ms-1"></i></span>
                                                </template>
                                                <BDropdownItem>Recent</BDropdownItem>
                                                <BDropdownItem>Top Rated</BDropdownItem>
                                                <BDropdownItem>Last 7 DaysPrevious</BDropdownItem>
                                            </BDropdown>
                                        </div>
                                    </BCardHeader>

                                    <BCardBody>

                                        <simplebar data-simplebar style="height: 300px;" class="px-3 mx-n3 mb-2">
                                            <div class="d-flex mb-4">
                                                <div class="flex-shrink-0">
                                                    <img src="@assets/images/users/avatar-8.jpg" alt=""
                                                        class="avatar-xs rounded-circle" />
                                                </div>
                                                <div class="flex-grow-1 ms-3">
                                                    <h5 class="fs-13">Joseph Parker <small class="text-muted ms-2">20
                                                            Dec 2021 - 05:47AM</small></h5>
                                                    <p class="text-muted">I am getting message from customers that when
                                                        they place order always get error message .</p>
                                                    <BLink href="javascript: void(0);" class="badge text-muted bg-light"><i
                                                            class="mdi mdi-reply"></i>
                                                        Reply</BLink>
                                                    <div class="d-flex mt-4">
                                                        <div class="flex-shrink-0">
                                                            <img src="@assets/images/users/avatar-10.jpg" alt=""
                                                                class="avatar-xs rounded-circle" />
                                                        </div>
                                                        <div class="flex-grow-1 ms-3">
                                                            <h5 class="fs-13">Alexis Clarke <small
                                                                    class="text-muted ms-2">22 Dec 2021 -
                                                                    02:32PM</small></h5>
                                                            <p class="text-muted">Please be sure to check your Spam
                                                                mailbox to see if your email filters have identified the
                                                                email from Dell as spam.</p>
                                                            <BLink href="javascript: void(0);"
                                                                class="badge text-muted bg-light"><i
                                                                    class="mdi mdi-reply"></i> Reply</BLink>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="d-flex mb-4">
                                                <div class="flex-shrink-0">
                                                    <img src="@assets/images/users/avatar-6.jpg" alt=""
                                                        class="avatar-xs rounded-circle" />
                                                </div>
                                                <div class="flex-grow-1 ms-3">
                                                    <h5 class="fs-13">Donald Palmer <small class="text-muted ms-2">24
                                                            Dec 2021 - 05:20PM</small></h5>
                                                    <p class="text-muted">If you have further questions, please contact
                                                        Customer Support from the “Action Menu” on your <BLink
                                                            href="javascript:void(0);" class="text-decoration-underline">
                                                            Online Order Support
                                                        </BLink>.
                                                    </p>
                                                    <BLink href="javascript: void(0);" class="badge text-muted bg-light"><i
                                                            class="mdi mdi-reply"></i>
                                                        Reply</BLink>
                                                </div>
                                            </div>
                                            <div class="d-flex">
                                                <div class="flex-shrink-0">
                                                    <img src="@assets/images/users/avatar-10.jpg" alt=""
                                                        class="avatar-xs rounded-circle" />
                                                </div>
                                                <div class="flex-grow-1 ms-3">
                                                    <h5 class="fs-13">Alexis Clarke <small class="text-muted ms-2">26
                                                            min ago</small></h5>
                                                    <p class="text-muted">Your <BLink href="javascript:void(0)"
                                                            class="text-decoration-underline">Online Order Support
                                                        </BLink>
                                                        provides you with the most current status of your order. To help
                                                        manage your order refer to the “Action Menu” to initiate return,
                                                        contact Customer Support and more.</p>
                                                    <BRow class="g-2 mb-3">
                                                        <BCol lg="1" sm="2" cols="6">
                                                            <img src="@assets/images/small/img-4.jpg" alt=""
                                                                class="img-fluid rounded">
                                                        </BCol>
                                                        <BCol lg="1" sm="2" cols="6">
                                                            <img src="@assets/images/small/img-5.jpg" alt=""
                                                                class="img-fluid rounded">
                                                        </BCol>
                                                    </BRow>
                                                    <BLink href="javascript: void(0);" class="badge text-muted bg-light"><i
                                                            class="mdi mdi-reply"></i>
                                                        Reply</BLink>
                                                    <div class="d-flex mt-4">
                                                        <div class="flex-shrink-0">
                                                            <img src="@assets/images/users/avatar-6.jpg" alt=""
                                                                class="avatar-xs rounded-circle" />
                                                        </div>
                                                        <div class="flex-grow-1 ms-3">
                                                            <h5 class="fs-13">Donald Palmer <small class="text-muted ms-2">8
                                                                    sec ago</small></h5>
                                                            <p class="text-muted">Other shipping methods are available
                                                                at checkout if you want your purchase delivered faster.
                                                            </p>
                                                            <BLink href="javascript: void(0);"
                                                                class="badge text-muted bg-light"><i
                                                                    class="mdi mdi-reply"></i> Reply</BLink>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </simplebar>
                                        <form class="mt-4">
                                            <BRow class="g-3">
                                                <BCol cols="12">
                                                    <label for="exampleFormControlTextarea1"
                                                        class="form-label text-body">Leave a Comments</label>
                                                    <textarea class="form-control bg-light border-light"
                                                        id="exampleFormControlTextarea1" rows="3"
                                                        placeholder="Enter your comment..."></textarea>
                                                </BCol>
                                                <BCol cols="12" class="text-end">
                                                    <BButton type="button" variant="ghost-secondary"
                                                        class="btn-icon waves-effect me-1">
                                                        <i class="ri-attachment-line fs-16"></i>
                                                    </BButton>
                                                    <BLink href="javascript:void(0);" class="btn btn-primary">Post
                                                        Comments</BLink>
                                                </BCol>
                                            </BRow>
                                        </form>
                                    </BCardBody>
                                </BCard>
                            </BCol>
                            <BCol xl="3" lg="4">
                                <BCard no-body>
                                    <BCardBody>
                                        <h5 class="card-title mb-4">Skills</h5>
                                        <div class="d-flex flex-wrap gap-2 fs-16">
                                            <BBadge variant="secondary-subtle" tag="div"
                                                class="fw-medium bg-secondary-subtle text-secondary">UI/UX</BBadge>
                                            <BBadge variant="secondary-subtle" tag="div"
                                                class="fw-medium bg-secondary-subtle text-secondary">Figma</BBadge>
                                            <BBadge variant="secondary-subtle" tag="div"
                                                class="fw-medium bg-secondary-subtle text-secondary">HTML</BBadge>
                                            <BBadge variant="secondary-subtle" tag="div"
                                                class="fw-medium bg-secondary-subtle text-secondary">CSS</BBadge>
                                            <BBadge variant="secondary-subtle" tag="div"
                                                class="fw-medium bg-secondary-subtle text-secondary">Javascript</BBadge>
                                            <BBadge variant="secondary-subtle" tag="div"
                                                class="fw-medium bg-secondary-subtle text-secondary">C#</BBadge>
                                            <BBadge variant="secondary-subtle" tag="div"
                                                class="fw-medium bg-secondary-subtle text-secondary">Nodejs</BBadge>
                                        </div>
                                    </BCardBody>
                                </BCard>

                                <BCard no-body>
                                    <BCardHeader class="align-items-center d-flex border-bottom-dashed">
                                        <BCardTitle class="mb-0 flex-grow-1">Members</BCardTitle>
                                        <div class="flex-shrink-0">
                                            <BButton type="button" variant="soft-danger" size="sm"><i
                                                    class="ri-share-line me-1 align-bottom"></i>  Пригласить
                                            </BButton>
                                        </div>
                                    </BCardHeader>

                                    <BCardBody>
                                        <simplebar data-simplebar style="height: 235px;" class="mx-n3 px-3">
                                            <div class="vstack gap-3">
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar-xs flex-shrink-0 me-3">
                                                        <img src="@assets/images/users/avatar-2.jpg" alt=""
                                                            class="img-fluid rounded-circle">
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <h5 class="fs-13 mb-0">
                                                            <BLink href="#" class="text-body d-block">Nancy Martino
                                                            </BLink>
                                                        </h5>
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                        <div class="d-flex align-items-center gap-1">
                                                            <BButton type="button" variant="light" size="sm">Message
                                                            </BButton>

                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-16 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-eye-fill align-bottom me-2 text-muted"></i>
                                                                    View</BDropdownItem>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Favorite </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar-xs flex-shrink-0 me-3">
                                                        <div
                                                            class="avatar-title bg-danger-subtle text-danger rounded-circle">
                                                            HB
                                                        </div>
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <h5 class="fs-13 mb-0">
                                                            <BLink href="#" class="text-body d-block">Henry Baird
                                                            </BLink>
                                                        </h5>
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                        <div class="d-flex align-items-center gap-1">
                                                            <BButton type="button" variant="light" size="sm">Message
                                                            </BButton>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-16 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-eye-fill align-bottom me-2 text-muted"></i>
                                                                    View</BDropdownItem>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Favorite </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar-xs flex-shrink-0 me-3">
                                                        <img src="@assets/images/users/avatar-3.jpg" alt=""
                                                            class="img-fluid rounded-circle">
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <h5 class="fs-13 mb-0">
                                                            <BLink href="#" class="text-body d-block">Frank Hook
                                                            </BLink>
                                                        </h5>
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                        <div class="d-flex align-items-center gap-1">
                                                            <BButton type="button" variant="light" size="sm">Message
                                                            </BButton>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-16 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-eye-fill align-bottom me-2 text-muted"></i>
                                                                    View</BDropdownItem>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Favorite </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar-xs flex-shrink-0 me-3">
                                                        <img src="@assets/images/users/avatar-4.jpg" alt=""
                                                            class="img-fluid rounded-circle">
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <h5 class="fs-13 mb-0">
                                                            <BLink href="#" class="text-body d-block">Jennifer Carter
                                                            </BLink>
                                                        </h5>
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                        <div class="d-flex align-items-center gap-1">
                                                            <BButton type="button" variant="light" size="sm">Message
                                                            </BButton>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-16 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-eye-fill align-bottom me-2 text-muted"></i>
                                                                    View</BDropdownItem>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Favorite </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar-xs flex-shrink-0 me-3">
                                                        <div
                                                            class="avatar-title bg-success-subtle text-success rounded-circle">
                                                            AC
                                                        </div>
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <h5 class="fs-13 mb-0">
                                                            <BLink href="#" class="text-body d-block">Alexis Clarke
                                                            </BLink>
                                                        </h5>
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                        <div class="d-flex align-items-center gap-1">
                                                            <BButton type="button" variant="light" size="sm">Message
                                                            </BButton>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-16 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-eye-fill align-bottom me-2 text-muted"></i>
                                                                    View</BDropdownItem>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Favorite </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar-xs flex-shrink-0 me-3">
                                                        <img src="@assets/images/users/avatar-7.jpg" alt=""
                                                            class="img-fluid rounded-circle">
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <h5 class="fs-13 mb-0">
                                                            <BLink href="#" class="text-body d-block">Joseph Parker
                                                            </BLink>
                                                        </h5>
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                        <div class="d-flex align-items-center gap-1">
                                                            <BButton type="button" variant="light" size="sm">Message
                                                            </BButton>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-16 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-eye-fill align-bottom me-2 text-muted"></i>
                                                                    View</BDropdownItem>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Favorite </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </simplebar>
                                    </BCardBody>
                                </BCard>

                                <BCard no-body>
                                    <BCardHeader class="align-items-center d-flex border-bottom-dashed">
                                        <BCardTitle class="mb-0 flex-grow-1">Attachments</BCardTitle>
                                        <div class="flex-shrink-0">
                                            <BButton type="button" variant="soft-success" size="sm"><i
                                                    class="ri-upload-2-fill me-1 align-bottom"></i> Upload</BButton>
                                        </div>
                                    </BCardHeader>

                                    <BCardBody>

                                        <div class="vstack gap-2">
                                            <div class="border rounded border-dashed p-2">
                                                <div class="d-flex align-items-center">
                                                    <div class="flex-shrink-0 me-3">
                                                        <div class="avatar-sm">
                                                            <div class="avatar-title bg-light text-secondary rounded fs-24">
                                                                <i class="ri-folder-zip-line"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex-grow-1 overflow-hidden">
                                                        <h5 class="fs-13 mb-1">
                                                            <BLink href="#" class="text-body text-truncate d-block">
                                                                App-pages.zip</BLink>
                                                        </h5>
                                                        <div>2.2MB</div>
                                                    </div>
                                                    <div class="flex-shrink-0 ms-2">
                                                        <div class="d-flex gap-1">
                                                            <button type="button"
                                                                class="btn btn-icon text-muted btn-sm fs-18"><i
                                                                    class="ri-download-2-line"></i></button>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-18 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Rename </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="border rounded border-dashed p-2">
                                                <div class="d-flex align-items-center">
                                                    <div class="flex-shrink-0 me-3">
                                                        <div class="avatar-sm">
                                                            <div class="avatar-title bg-light text-secondary rounded fs-24">
                                                                <i class="ri-file-ppt-2-line"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex-grow-1 overflow-hidden">
                                                        <h5 class="fs-13 mb-1">
                                                            <BLink href="#" class="text-body text-truncate d-block">
                                                                Velzon-admin.ppt</BLink>
                                                        </h5>
                                                        <div>2.4MB</div>
                                                    </div>
                                                    <div class="flex-shrink-0 ms-2">
                                                        <div class="d-flex gap-1">
                                                            <button type="button"
                                                                class="btn btn-icon text-muted btn-sm fs-18"><i
                                                                    class="ri-download-2-line"></i></button>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-18 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Rename </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="border rounded border-dashed p-2">
                                                <div class="d-flex align-items-center">
                                                    <div class="flex-shrink-0 me-3">
                                                        <div class="avatar-sm">
                                                            <div class="avatar-title bg-light text-secondary rounded fs-24">
                                                                <i class="ri-folder-zip-line"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex-grow-1 overflow-hidden">
                                                        <h5 class="fs-13 mb-1">
                                                            <BLink href="#" class="text-body text-truncate d-block">
                                                                Images.zip</BLink>
                                                        </h5>
                                                        <div>1.2MB</div>
                                                    </div>
                                                    <div class="flex-shrink-0 ms-2">
                                                        <div class="d-flex gap-1">
                                                            <button type="button"
                                                                class="btn btn-icon text-muted btn-sm fs-18"><i
                                                                    class="ri-download-2-line"></i></button>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-18 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Rename </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="border rounded border-dashed p-2">
                                                <div class="d-flex align-items-center">
                                                    <div class="flex-shrink-0 me-3">
                                                        <div class="avatar-sm">
                                                            <div class="avatar-title bg-light text-secondary rounded fs-24">
                                                                <i class="ri-image-2-line"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex-grow-1 overflow-hidden">
                                                        <h5 class="fs-13 mb-1">
                                                            <BLink href="#" class="text-body text-truncate d-block">
                                                                bg-pattern.png</BLink>
                                                        </h5>
                                                        <div>1.1MB</div>
                                                    </div>
                                                    <div class="flex-shrink-0 ms-2">
                                                        <div class="d-flex gap-1">
                                                            <button type="button"
                                                                class="btn btn-icon text-muted btn-sm fs-18"><i
                                                                    class="ri-download-2-line"></i></button>
                                                            <BDropdown variant="link"
                                                                toggle-class="btn btn-icon btn-sm fs-18 text-muted arrow-none"
                                                                menu-class="dropdown-menu-end"
                                                                :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                                <template #button-content>
                                                                    <i class="ri-more-fill"></i>
                                                                </template>
                                                                <BDropdownItem><i
                                                                        class="ri-pencil-fill align-bottom me-2 text-muted"></i>
                                                                    Rename </BDropdownItem>
                                                                <BDropdownItem> <i
                                                                        class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                                    Delete
                                                                </BDropdownItem>
                                                            </BDropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="mt-2 text-center">
                                                <BButton type="button" variant="secondary">View more</BButton>
                                            </div>
                                        </div>
                                    </BCardBody>
                                </BCard>
                            </BCol>
                        </BRow> -->
                    </BTab>
                    <BTab title="Документы" class="fw-semibold pt-2">
                        <h5>в разработке</h5>
                        <!-- <div class="card">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-4">
                                    <h5 class="card-title flex-grow-1">Документы</h5>
                                </div>
                                <BRow>
                                    <div class="table-responsive table-card">
                                        <table class="table table-borderless align-middle mb-0">
                                            <thead class="table-light">
                                                <tr>
                                                    <th scope="col">File Name</th>
                                                    <th scope="col">Type</th>
                                                    <th scope="col">Size</th>
                                                    <th scope="col">Upload Date</th>
                                                    <th scope="col" style="width: 120px;">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-secondary rounded fs-24">
                                                                    <i class="ri-folder-zip-line"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0)" class="text-body">
                                                                        Artboard-documents.zip
                                                                    </BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>Zip File</td>
                                                    <td>4.57 MB</td>
                                                    <td>12 Dec 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-danger rounded fs-24">
                                                                    <i class="ri-file-pdf-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Bank Management System
                                                                    </BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>PDF File</td>
                                                    <td>8.89 MB</td>
                                                    <td>24 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-secondary rounded fs-24">
                                                                    <i class="ri-video-line"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Tour-video.mp4</BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>MP4 File</td>
                                                    <td>14.62 MB</td>
                                                    <td>19 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-success rounded fs-24">
                                                                    <i class="ri-file-excel-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Account-statement.xsl
                                                                    </BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>XSL File</td>
                                                    <td>2.38 KB</td>
                                                    <td>14 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-warning rounded fs-24">
                                                                    <i class="ri-folder-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Project Screenshots
                                                                        Collection</BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>Folder File</td>
                                                    <td>87.24 MB</td>
                                                    <td>08 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-danger rounded fs-24">
                                                                    <i class="ri-image-2-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Velzon-logo.png</BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>PNG File</td>
                                                    <td>879 KB</td>
                                                    <td>02 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="text-center mt-3">
                                        <BLink href="javascript:void(0);" class="text-success "><i
                                                class="mdi mdi-loading mdi-spin fs-20 align-middle me-2"></i> Load
                                            more </BLink>
                                    </div>

                                </BRow>
                            </div>
                        </div> -->
                    </BTab>
                    <BTab title="Гант" class="fw-semibold pt-2">
                        <h5>в разработке</h5>
                        <!-- <div class="card">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-4">
                                    <h5 class="card-title flex-grow-1">Документы</h5>
                                </div>
                                <BRow>
                                    <div class="table-responsive table-card">
                                        <table class="table table-borderless align-middle mb-0">
                                            <thead class="table-light">
                                                <tr>
                                                    <th scope="col">File Name</th>
                                                    <th scope="col">Type</th>
                                                    <th scope="col">Size</th>
                                                    <th scope="col">Upload Date</th>
                                                    <th scope="col" style="width: 120px;">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-secondary rounded fs-24">
                                                                    <i class="ri-folder-zip-line"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0)" class="text-body">
                                                                        Artboard-documents.zip
                                                                    </BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>Zip File</td>
                                                    <td>4.57 MB</td>
                                                    <td>12 Dec 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-danger rounded fs-24">
                                                                    <i class="ri-file-pdf-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Bank Management System
                                                                    </BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>PDF File</td>
                                                    <td>8.89 MB</td>
                                                    <td>24 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-secondary rounded fs-24">
                                                                    <i class="ri-video-line"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Tour-video.mp4</BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>MP4 File</td>
                                                    <td>14.62 MB</td>
                                                    <td>19 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-success rounded fs-24">
                                                                    <i class="ri-file-excel-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Account-statement.xsl
                                                                    </BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>XSL File</td>
                                                    <td>2.38 KB</td>
                                                    <td>14 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-warning rounded fs-24">
                                                                    <i class="ri-folder-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Project Screenshots
                                                                        Collection</BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>Folder File</td>
                                                    <td>87.24 MB</td>
                                                    <td>08 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-sm">
                                                                <div
                                                                    class="avatar-title bg-light text-danger rounded fs-24">
                                                                    <i class="ri-image-2-fill"></i>
                                                                </div>
                                                            </div>
                                                            <div class="ms-3 flex-grow-1">
                                                                <h5 class="fs-14 mb-0">
                                                                    <BLink href="javascript:void(0);" class="text-body">
                                                                        Velzon-logo.png</BLink>
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>PNG File</td>
                                                    <td>879 KB</td>
                                                    <td>02 Nov 2021</td>
                                                    <td>
                                                        <BDropdown variant="link"
                                                            toggle-class="btn btn-soft-secondary btn-sm btn-icon arrow-none"
                                                            menu-class="dropdown-menu-end"
                                                            :offset="{ alignmentAxis: -130, crossAxis: 0, mainAxis: 10 }">
                                                            <template #button-content>
                                                                <i class="ri-more-fill"></i>
                                                            </template>
                                                            <BDropdownItem><i
                                                                    class="ri-eye-fill me-2 align-bottom text-muted"></i>
                                                                View </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-download-2-fill me-2 align-bottom text-muted"></i>
                                                                Download </BDropdownItem>
                                                            <BDropdownItem><i
                                                                    class="ri-delete-bin-5-fill me-2 align-bottom text-muted"></i>
                                                                Delete </BDropdownItem>
                                                        </BDropdown>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="text-center mt-3">
                                        <BLink href="javascript:void(0);" class="text-success "><i
                                                class="mdi mdi-loading mdi-spin fs-20 align-middle me-2"></i> Load
                                            more </BLink>
                                    </div>

                                </BRow>
                            </div>
                        </div> -->
                    </BTab>
                    <BTab @click="loadParticipants" title="Участники" class="fw-semibold pt-2">

                        <BRow class="g-4 mb-3">
                            <BCard no-body>
                            <BCardBody>
                                <BForm>
                                <BRow class="g-3">
                                    <!-- <BCol xxl="5" sm="6">
                                    <div class="search-box">
                                        <input type="text" class="form-control search bg-light border-light" id="searchCompany"
                                        placeholder="Search for company, industry type...">
                                        <i class="ri-search-line search-icon"></i>
                                    </div>
                                    </BCol>

                                    <BCol xxl="3" sm="6">
                                    <flat-pickr v-model="date10" :config="defaultDateConfig"
                                        class="form-control bg-light border-light  flatpickr-input"></flat-pickr>
                                    </BCol> -->

                                    <!-- <BCol xxl="2" sm="4">
                                    <div class="input-light">
                                        <select v-model="actualRole" class="form-control bg-light border-light" data-choices data-choices-search-false
                                        name="choices-single-default" id="idType">
                                        <option value="-1" selected>Все</option>
                                        <option value="0">Мои команды</option>
                                        <option value="1">Команды ответственного</option>
                                        <option value="2">Мои участники</option>
                                        <option value="3">Участники ответственного</option>
                                        <option value="4">Приглашенные</option>
                                        </select>
                                    </div>
                                    </BCol> -->
                                    <BCol v-if="canManageMembers" sm="auto">
                                        <div>
                                            <BButton @click.stop="showForm = true" type="button" variant="soft-success" ><i class="ri-share-line me-1 align-bottom"></i>
                                                Пригласить в проект</BButton>
                                        </div>
                                    </BCol>
                                    <!-- <BCol xxl="2" sm="4">
                                    <BButton type="button" variant="secondary" class="w-100" >
                                        <i class="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                    </BButton>
                                    </BCol> -->
                                </BRow>
                                </BForm>
                            </BCardBody>
                            </BCard>
                            <!-- <BCol sm>
                                <div class="d-flex">
                                    <div class="search-box me-4">
                                        <input type="text" class="form-control" placeholder="Искать участника или команду...">
                                        <i class="ri-search-line search-icon"></i>
                                    </div>
                                </div>
                            </BCol> -->

                        </BRow>
                        <!-- <pre>

 {{ participants }}
 </pre> -->
 <!-- {{ participants.allTaskRoles }} -->
                        <div class="team-list list-view-filter position-relative" v-if="!isLoading && participants">

                            <template v-for="team in filteredTeams" :key="'t'+team.id">
                            <BCard v-if="(actualRole == -1) || (!team.is_external || actualRole == 1) || (team.is_external || actualRole == 2)" no-body class="team-box">
                                <BCardBody class="px-4" style="position: relative;">
                                    <BRow class="align-items-center team-row">
                                        <div class="col team-settings d-flex flex-wrap gap-2 justify-content-end">
                                                <BButton @click="router.visit(route('teams.show', team.hash))" class="btn btn-soft-success me-1" size="sm"><i class="ri-arrow-right-line align-bottom"></i></BButton>

                                                <BButton v-if="canManageMembers" @click.stop="removeTeamFromProjectOrTask(team.id, team.name, team.source.type == 'task'?team.source.hash:null)" variant="soft-danger" v-b-tooltip.hover
                                                size="sm"
                                                        title="Отвязать эту команду">
                                                    <i class="ri-link-unlink"></i>
                                                </BButton>
                                        </div>
                                        <BCol lg="4" sm="4" cols>
                                            <div class="team-profile-img">
                                                <div class="rounded position-relative" >
                                                    <img v-if="team.avatar_path"
                                                        :src="team.avatar_path"
                                                        :alt="team.name"
                                                        class="member-img img-fluid d-block rounded shadow"
                                                        style="object-fit: cover; width: 48px; height: 48px;"
                                                    />
                                                    <div
                                                        v-else
                                                        class="avatar-title rounded fs-24 shadow"
                                                        :class="`bg-${getTeamColor(team.name)}-subtle text-${getTeamColor(team.name)}`"
                                                        style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-weight: 700;"
                                                    >
                                                        {{ team.name.charAt(0).toUpperCase() }}
                                                    </div>
                                                    <div class="position-absolute" style="bottom: -5px; right: -5px;">
                                                        <div class="avatar-xs rounded-circle bg-light  d-flex align-items-center justify-content-center shadow-sm"
                                                            style="width: 22px; height: 22px;">
                                                           <i class="ri-team-fill text-success fs-12"></i>
                                                        </div>
                                                    </div>

                                                </div>
                                                <!-- <div class="rounded position-relative"  v-if="team.avatar">

                                                    <img  :src="team.avatar" class="member-img img-fluid d-block rounded shadow">
                                                    <div class="position-absolute" style="bottom: -5px; right: -5px; z-index: 2;">
                                                        <div class="avatar-xs rounded-circle bg-white border d-flex align-items-center justify-content-center shadow-sm"
                                                            style="width: 22px; height: 22px;">

                                                            <i class="ri-team-fill text-success fs-12"></i>
                                                        </div>
                                                    </div>
                                                    </div>
                                                    <div v-else
                                                            class="avatar-xs rounded-circle shadow-sm position-relative"
                                                            :class="[`bg-${getTeamColor(team.name)}-subtle text-${getTeamColor(team.name)}`]"
                                                            style="display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px;">
                                                            {{ team.name.charAt(0).toUpperCase() }}
                                                            <div class="position-absolute" style="bottom: -5px; right: -5px; z-index: 2;">
                                                        <div class="avatar-xs rounded-circle bg-white border d-flex align-items-center justify-content-center shadow-sm"
                                                            style="width: 22px; height: 22px;">

                                                            <i class="ri-team-fill text-success fs-12"></i>
                                                        </div>
                                                    </div>
                                                        </div> -->
                                                <div class="team-content">
                                                    <BLink href="#" class="d-block">
                                                        <h5 class="fs-16 mb-1">{{ team.name }}</h5>
                                                    </BLink>
                                                    <p class="text-muted mb-0">{{ team.owner_id == $page.props.auth.user.id?'Моя команда':'Внешняя команда' }}</p>
                                                    <p>{{ team.added_by.id == $page.props.auth.user.id ?'Добавлена мной':'Привязана ответственным'}}</p>
                                                </div>
                                            </div>
                                        </BCol>
                                        <BCol lg="4" sm="4" cols>
                                            <BRow class="text-muted text-center">
                                                <BCol cols="6" class="border-end border-end-dashed d-flex align-items-center justify-content-start">
                                                    <select v-if="canManageMembers"
                                                        v-model="team.role.id"
                                                        @change="changeTeamRole(team, $event.target.value)"
                                                        class="form-select form-select-sm flex-grow-0"
                                                    >
                                                        <option
                                                            v-for="role in project_roles"
                                                            :key="role.id" :value="role.id"
                                                        >
                                                            {{ role.name }}
                                                        </option>
                                                    </select>
                                                    <div v-else>{{ team.role.name }}</div>
                                                    <div class="ms-2 d-flex align-items-center justify-content-center" style="width: 24px; height: 24px;">
                                                        <transition name="fade">
                                                            <span v-if="savedId === 'team_' + team.id" class="text-success">
                                                                <i class="ri-checkbox-circle-fill fs-18"></i>
                                                            </span>
                                                        </transition>
                                                    </div>
                                                    <!-- <p class="text-muted mb-0">{{ team.role.name }}</p> -->
                                                </BCol>
                                                <BCol cols="6">
                                                    <span>{{ team['members'].length }} участвует</span>
                                                    <div v-if="team.pendingCount > 0">и {{ team.pendingCount }} приглашено</div>
                                                </BCol>
                                            </BRow>
                                        </BCol>
                                    </BRow>
                                </BCardBody>
                            </BCard>
                            </template>
                            <template v-for="member in filteredMembers" :key="'t'+member.id">
                            <BCard  no-body class="team-box">
                                <BCardBody class="px-4" style="position: relative;">
                                    <BRow class="align-items-center team-row">
                                        <div class="col team-settings">
                                            <BRow class="align-items-center">
                                                <div class="col team-settings d-flex flex-wrap gap-2 justify-content-end">
                                                    <BButton class="btn btn-soft-success me-1" size="sm"><i class="ri-arrow-right-line align-bottom"></i></BButton>

                                                    <BButton v-if="canManageMembers" @click.stop="removeMember(member)" variant="soft-danger" v-b-tooltip.hover
                                                    size="sm"
                                                            title="Удалить этого пользователя">
                                                        <i class="ri-link-unlink"></i>
                                                    </BButton>
                                                </div>
                                            </BRow>
                                        </div>
                                        <BCol lg="4" sm="4" cols>
                                            <div class="team-profile-img">
                                                    <div class="rounded position-relative" style="width: 50px;" v-if="member.avatar">

                                                    <img  :src="member.avatar" class="member-img img-fluid d-block rounded shadow">
                                                    <div class="position-absolute" style="bottom: -5px; right: -5px; z-index: 2;">
                                                        <div class="avatar-xs rounded-circle bg-white border d-flex align-items-center justify-content-center shadow-sm"
                                                            style="width: 22px; height: 22px;">
                                                            <i class="ri-user-3-fill text-primary fs-12"></i>
                                                        </div>
                                                    </div>
                                                    </div>
                                                    <div v-else
                                                            class="avatar-xs rounded-circle shadow-sm position-relative"
                                                            :class="[`bg-${getTeamColor(member.email)}-subtle text-${getTeamColor(member.email)}`]"
                                                            style="display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px;">
                                                            {{ member.email.charAt(0).toUpperCase() }}
                                                        </div>
                                                    <!-- <img src="@assets/images/users/avatar-2.jpg" alt=""
                                                        class="img-fluid d-block rounded-circle" /> -->

                                                <div class="team-content">
                                                    <BLink href="#" class="d-block">
                                                        <h5 class="fs-16 mb-1">{{ member.name }}</h5>
                                                    </BLink>
                                                    <p class="text-muted mb-0">{{member.is_pending?'приглашен':'участвует'}} {{member.added_by.id != $page.props.auth.user.id?'от ' + member.added_by?.name:'от меня'}}</p>
                                                </div>
                                                <div class="team-content">
                                                    Приглашен в
                                                    <span v-if="member.source.type === 'project'">
                                                        <i class="ri-folder-open-line me-1"></i> <BLink :href="route('projects.show', { project: member.source.hash })">{{ member.source.name }}</BLink>
                                                    </span>
                                                    <span v-else>
                                                        <i class="ri-task-line me-1 text-muted"></i> <BLink @click="openTask(member.source.hash)">{{ member.source.name }}</BLink>
                                                    </span>

                                                </div>
                                            </div>
                                        </BCol>
                                        <BCol lg="4" sm="4" cols>
                                            <BRow class="text-muted text-center">
                                                <BCol cols="6" class="border-end border-end-dashed d-flex align-items-center justify-content-start" v-if="participants">
                                                    <select v-if="canManageMembers"
                                                        v-model="member.role.id"
                                                        @change="changeRole(member, $event.target.value)"
                                                        class="form-select form-select-sm border-light bg-light"
                                                    >

                                                        <option
                                                            v-for="role in project_roles"
                                                            :key="role.id"
                                                            :value="role.id"
                                                        >
                                                            {{ role.name }}
                                                        </option>
                                                    </select>
                                                    <div v-else>{{ member.role.name }}</div>
                                                    <div class="ms-2 d-flex align-items-center justify-content-center" style="width: 24px; height: 24px;">
                                                        <transition name="fade">
                                                            <span v-if="savedId === (member.id || member.email)" class="text-success">
                                                                <i class="ri-checkbox-circle-fill fs-18"></i>
                                                            </span>
                                                        </transition>
                                                    </div>
                                                </BCol>
                                            </BRow>
                                        </BCol>
                                    </BRow>
                                </BCardBody>
                            </BCard>
                            </template>
                        </div>
                        <div v-else class="position-absolute w-100 h-100 d-flex align-items-center justify-content-center bg-white-75"
                            style="z-index: 10; background: rgba(255,255,255,0.7);">
                            <i class="mdi mdi-loading mdi-spin fs-24 text-primary"></i>

                        </div>


                    </BTab>
                </BTabs>
            </BCol>
        </BRow>

    </Layout>
</template>

<style lang="scss" scoped>
.ri-check-line {
    font-size: 16px;
    position: relative;
    top: 0px;
    color: rgba(10, 179, 156, 0.85);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.kanban-tab-wrapper {
    height: calc(100vh - 250px);
    min-height: 500px;
    overflow: hidden;
}

.flows-tab-wrapper {
    height: calc(100vh - 250px);
    min-height: 500px;
    overflow: hidden;
}

.backlog-tab-wrapper {
    max-height: calc(100vh - 350px);
    overflow-y: auto;
}

/* Заставляем BTabs цепочку передавать высоту: tab-pane как flex-колонка */
:deep(.tab-pane.active.show) {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

/* ================================================================
   Модернизация списка задач: стили
   ================================================================ */

/* Анимация строк */
.task-row-transition {
    transition: all 0.2s ease;
}

/* Эффект выцветания старых задач */
.task-faded {
    opacity: 0.6;
}
.task-faded:hover {
    opacity: 1;
}

/* Ограничение ширины названия и ховер */
.max-w-task-title {
    max-width: 320px;
}
.task-title-hover:hover {
    color: #405189 !important;
    text-decoration: underline;
}

/* Точка статуса */
.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}

/* Кастомный скроллбар */
.custom-scrollbar::-webkit-scrollbar {
    height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

/* Drag-to-scroll: курсоры */
.table-responsive.custom-scrollbar {
    cursor: grab;
}
.table-responsive.custom-scrollbar.active-dragging {
    cursor: grabbing;
    scroll-behavior: auto;
}

/* Липкие колонки для десктопов */
@media (min-width: 768px) {
    .sticky-col {
        position: sticky;
        left: 0;
        background-color: #fff !important;
        z-index: 3;
    }
    .sticky-col-name {
        position: sticky;
        left: 80px; /* Ширина колонки прогресса */
        background-color: #fff !important;
        z-index: 3;
        border-right: 2px solid #f3f3f3;
    }
    thead th.sticky-col,
    thead th.sticky-col-name {
        z-index: 4;
        background-color: #f3f6f9 !important;
    }
}

/* Индикатор скролла для мобильных */
.scroll-indicator-wrapper {
    height: 3px;
    width: 80px;
    background-color: #f3f3f3;
    border-radius: 2px;
    overflow: hidden;
}
.scroll-indicator-bar {
    height: 100%;
    background-color: #405189;
    width: 0;
    transition: width 0.1s ease-out;
}

/* Компактные аватарки для участников */
.avatar-xxs {
    width: 24px;
    height: 24px;
    object-fit: cover;
}

/* ================================================================
   Исправления согласно correct_tasks.md
   ================================================================ */

/* 1. Убираем вертикальный скролл в .table-responsive */
.table-responsive {
    overflow-x: auto !important;
    overflow-y: hidden !important;
    max-height: none !important;
}

/* 5. Единый стиль статуса и приоритета */
.badge-outline-custom {
    border: 1px solid;
    border-radius: 6px;
    padding: 3px 10px;
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 500;
    background-color: transparent;
}

.status-badge {
    gap: 6px;
}

.status-circle-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
    margin-right: 8px;
}

.priority-high {
    border-color: rgba(245, 101, 101, 0.4) !important;
    color: #f56565 !important;
    background-color: rgba(245, 101, 101, 0.06) !important;
}

.priority-medium {
    border-color: rgba(237, 137, 54, 0.4) !important;
    color: #ed8936 !important;
    background-color: rgba(237, 137, 54, 0.06) !important;
}

.priority-low {
    border-color: rgba(41, 156, 219, 0.4) !important;
    color: #299cdb !important;
    background-color: rgba(41, 156, 219, 0.06) !important;
}

/* 4. Стили шапки проекта */
.max-w-project-desc {
    max-width: 680px;
    line-height: 1.5;
    word-break: break-word;
}

.project-icon-box {
    width: 52px;
    height: 52px;
    min-width: 52px;
}

.project-icon-box img {
    object-fit: cover;
}

.project-icon-box span {
    line-height: 1;
}

.tracking-wider {
    letter-spacing: 0.05em;
}

.border-start-dash {
    border-left: 1px dashed #e9ebec;
}

@media (max-width: 767.98px) {
    .project-meta-block {
        border-left: none !important;
        padding-left: 0 !important;
        width: 100%;
        justify-content: space-between;
        background-color: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
    }

    .meta-item-box {
        text-align: left !important;
    }

    .border-start-dash {
        border-left: none !important;
        padding-left: 0 !important;
    }
}

/* 6. Стили кнопок действий */
.no-decor-btn {
    text-decoration: none !important;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.no-decor-btn:hover {
    background-color: #f8f9fa;
}

.btn-group .btn-link.text-danger:hover {
    background-color: #fef4f2;
}

.btn-icon.btn-soft-success:active, .btn-icon.btn-soft-danger:active {
    transform: scale(0.92);
}

.actions-container {
    min-height: 32px;
}

/* 8. Защита от пустых строк таблицы */
tr:empty {
    display: none !important;
}

.table > tbody > tr > td {
    padding: 0.75rem 0.6rem;
}
</style>

<!-- <script setup>
import Layout from "@/Layouts/ProjectsLayout.vue";
import { CountTo } from "vue3-count-to";
import { useForm } from '@inertiajs/vue3';
import { router } from '@inertiajs/vue3';
const form = useForm({
    email: '',
    role: 0,
  });
const props = defineProps({
    project: Object,
    errors: Object,
    myTeams: Array,
    userRole: Number
});
  const addMember = () => {
      form.post(route('projects.members.store', props.project.hash), {
          onSuccess: () => {
              form.reset();
              alert('Пользователь добавлен!');
          },
      });
  };
  const teamForm = useForm({
    team_id: '',
    role: 0
});
const addTeamToProject = () => {
    // Отправляем POST запрос на роут добавления команды к проекту
    teamForm.post(route('projects.teams.store', props.project.hash), {
        onSuccess: () => {
            teamForm.reset(); // Сбрасываем форму при успехе
            alert('Команда успешно привязана!');
        },
        onError: (errors) => {
            console.error('Ошибка при добавлении команды:', errors);
        },
        preserveScroll: true, // Чтобы страница не дергалась вверх
    });
};
const removeTeamFromProject = (teamId, teamName) => {
    if (confirm(`Вы уверены, что хотите отвязать команду "${teamName}" от этого проекта?`)) {
        // Передаем хэш проекта и ID команды
        router.delete(route('projects.teams.destroy', {
            project: props.project.hash,
            team: teamId
        }), {
            preserveScroll: true,
        });
    }
};
// Удаление участника
const removeMember = (userId) => {
    if(confirm('Удалить участника из проекта?')) {
        router.delete(route('projects.members.destroy', { project: props.project.hash, user: userId }));
    }
};

// Отмена инвайта
const cancelInvite = (inviteId) => {
    router.delete(route('projects.invitations.destroy', inviteId));
};
const taskForm = useForm({
    name: '',
    description: ''
});

const createTask = () => {
    taskForm.post(route('tasks.store', props.project.hash), {
        onSuccess: () => taskForm.reset(),
    });
};
</script> -->

