<template>
  <div class="flow-workspace-container d-flex flex-column h-100 bg-white border rounded-3 position-relative" :class="{ 'flow-workspace-container--fullscreen': isFullscreen }">
    <!-- Верхний тулбар управления холстом -->
    <div class="d-flex align-items-center justify-content-between p-3 border-bottom bg-light bg-opacity-50">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('back')">
          <i class="ri-arrow-left-line me-1"></i> Назад к списку
        </button>
        <h5 class="mb-0 fw-semibold text-dark">{{ flowName }}</h5>
      </div>
      <div class="d-flex gap-2">
        <!-- Кнопка Fullscreen — раскрывает ВСЮ рабочую область на весь экран -->
        <button class="btn btn-sm btn-ghost-secondary rounded-circle p-1 d-flex align-items-center justify-content-center sidebar-toggle-btn"
                @click="isFullscreen = !isFullscreen"
                :title="isFullscreen ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран'">
          <i v-if="isFullscreen" class="ri-fullscreen-exit-line fs-16"></i>
          <i v-else class="ri-fullscreen-line fs-16"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" @click="exportToPdf">
          <i class="ri-file-pdf-line me-1"></i> Скачать PDF
        </button>
        <button class="btn btn-sm btn-success" @click="saveFlowData">
          <i class="ri-save-line me-1"></i> Сохранить схему
        </button>
      </div>
    </div>

    <!-- Основная рабочая зона: Сетка слева, Панель блоков справа -->
    <div class="d-flex flex-grow-1 position-relative overflow-hidden">
      <!-- Холст Vue Flow -->
      <div id="pdf-capture-zone" class="flex-grow-1 h-100 position-relative" @drop="onDrop" @dragover.prevent>
        <VueFlow
          id="flow-canvas"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :fit-view-on-init="false"
          :edges-updatable="true"
          @connect="onConnect"
          @edge-click="onEdgeClick"
          @pane-click="onPaneClick"
          class="custom-flow-grid"
        >
          <!-- Слоты кастомных узлов -->
          <template #node-custom-trigger="nodeProps">
            <CustomNode v-bind="nodeProps" @delete="deleteNode(nodeProps.id)" />
          </template>
          <template #node-custom-condition="nodeProps">
            <CustomNode v-bind="nodeProps" @delete="deleteNode(nodeProps.id)" />
          </template>
          <template #node-custom-action="nodeProps">
            <CustomNode v-bind="nodeProps" @delete="deleteNode(nodeProps.id)" />
          </template>

          <!-- Слот кастомного ребра с кнопкой удаления -->
          <template #edge-deletable="edgeProps">
            <DeletableEdge v-bind="edgeProps" :highlighted="selectedEdgeId === edgeProps.id" @delete-edge="deleteEdge" />
          </template>

          <Background pattern-color="#aaa" :gap="16" />
          <Controls position="bottom-left" />
        </VueFlow>
      </div>

      <!-- Боковая No-code панель доступных блоков робота -->
      <div v-if="flowType === 'automation'" class="sidebar-panel border-start bg-light p-3">
        <h6 class="fw-semibold text-uppercase fs-11 text-muted tracking-wider mb-2">Элементы робота</h6>

        <!-- Текстовая подсказка-инструкция -->
        <p class="fs-12 text-muted mb-3 fst-italic lh-sm">
          <i class="ri-information-line me-1 text-primary"></i> Зажмите и перетащите нужный элемент на доску слева:
        </p>

        <div class="d-flex flex-column gap-2">
          <!-- Блок 1: Триггер -->
          <div class="draggable-block bg-white p-2.5 border border-warning border-opacity-50 rounded-3 shadow-sm cursor-grab d-flex align-items-center justify-content-between text-dark fw-medium fs-13"
               draggable="true" @dragstart="onDragStart($event, 'custom-trigger')">
            <div class="d-flex align-items-center gap-2">
              <div class="icon-shape bg-soft-warning text-warning rounded-2 d-flex align-items-center justify-content-center p-1">
                <i class="ri-flashlight-fill fs-16"></i>
              </div>
              <span>1. Событие (Триггер)</span>
            </div>
            <i class="ri-drag-move-2-fill drag-icon text-muted fs-15 opacity-50"></i>
          </div>

          <!-- Блок 2: Условие -->
          <div class="draggable-block bg-white p-2.5 border border-primary border-opacity-50 rounded-3 shadow-sm cursor-grab d-flex align-items-center justify-content-between text-dark fw-medium fs-13"
               draggable="true" @dragstart="onDragStart($event, 'custom-condition')">
            <div class="d-flex align-items-center gap-2">
              <div class="icon-shape bg-soft-primary text-primary rounded-2 d-flex align-items-center justify-content-center p-1">
                <i class="ri-git-merge-fill fs-16"></i>
              </div>
              <span>2. Если Условие</span>
            </div>
            <i class="ri-drag-move-2-fill drag-icon text-muted fs-15 opacity-50"></i>
          </div>

          <!-- Блок 3: Действие -->
          <div class="draggable-block bg-white p-2.5 border border-success border-opacity-50 rounded-3 shadow-sm cursor-grab d-flex align-items-center justify-content-between text-dark fw-medium fs-13"
               draggable="true" @dragstart="onDragStart($event, 'custom-action')">
            <div class="d-flex align-items-center gap-2">
              <div class="icon-shape bg-soft-success text-success rounded-2 d-flex align-items-center justify-content-center p-1">
                <i class="ri-settings-5-fill fs-16"></i>
              </div>
              <span>3. Действие робота</span>
            </div>
            <i class="ri-drag-move-2-fill drag-icon text-muted fs-15 opacity-50"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { markRaw, nextTick, onMounted, ref } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import CustomNode from './nodes/CustomNode.vue';
import DeletableEdge from './nodes/DeletableEdge.vue';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import axios from 'axios';

const props = defineProps({
  flowId: { type: Number, default: null },
  flowName: { type: String, default: 'Новая схема' },
  flowType: { type: String, default: 'diagram' },
  initialData: { type: Object, default: () => ({}) },
  projectStatuses: { type: Array, default: () => [] },
  projectMembers: { type: Array, default: () => [] },
  projectHash: { type: String, required: true },
});

const emit = defineEmits(['back', 'saved']);

// Единый инстанс Vue Flow через id — nodes/edges из композабла
const {
  nodes,
  edges,
  addNodes,
  addEdges,
  removeNodes,
  removeEdges,
  screenToFlowCoordinate,
  fitView,
  getViewport,
  setViewport,
} = useVueFlow('flow-canvas');

// Состояние полноэкранного режима ВСЕЙ рабочей области
const isFullscreen = ref(false);

// ID выделенного ребра (для показа кнопки удаления)
const selectedEdgeId = ref(null);

// Инициализируем начальные данные в общий стор
nodes.value = props.initialData?.nodes || [];
edges.value = props.initialData?.edges || [];

// Ручной fitView только если уже есть узлы (fit-view-on-init=false чтобы не прыгал на пустом холсте)
onMounted(() => {
  if (nodes.value.length > 0) {
    fitView({ padding: 0.2 });
  }
});

// Регистрируем кастомный узел
const nodeTypes = {
  'custom-trigger': markRaw(CustomNode),
  'custom-condition': markRaw(CustomNode),
  'custom-action': markRaw(CustomNode),
};

// Регистрируем кастомное ребро с кнопкой удаления
const edgeTypes = {
  'deletable': markRaw(DeletableEdge),
};

// Логика Drag-and-Drop элементов на холст
const onDragStart = (event, nodeType) => {
  event.dataTransfer.setData('application/vueflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const onDrop = (event) => {
  const type = event.dataTransfer.getData('application/vueflow');
  if (!type) return;

  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY });

  const newNode = {
    id: `node_${Date.now()}`,
    type,
    position,
    label: 'Элемент автоматизации',
    data: {
      statuses: JSON.parse(JSON.stringify(props.projectStatuses || [])),
      members: JSON.parse(JSON.stringify(props.projectMembers || [])),
      field: 'status_id',
      operator: '=',
      value: '',
      status_id: props.projectStatuses?.[0]?.id || null,
      type: 'create_subtask',
    },
  };

  addNodes([newNode]);
};

// Удаление узла с доски и всех связанных с ним рёбер
const deleteNode = (nodeId) => {
  removeNodes([nodeId]);
};

// Удаление ребра (линии связи)
const deleteEdge = (edgeId) => {
  selectedEdgeId.value = null;
  removeEdges([edgeId]);
};

// Клик по ребру — показываем кнопку удаления
// @edge-click эмитит ОДИН объект { event, edge }
const onEdgeClick = ({ edge }) => {
  selectedEdgeId.value = edge.id;
};

// Клик по пустому холсту — скрываем кнопку удаления
const onPaneClick = () => {
  selectedEdgeId.value = null;
};

// Все новые связи создаются как deletable
const onConnect = (connection) => {
  const style = {};

  if (connection.sourceHandle === 'yes') {
    style.stroke = '#22c55e';
  } else if (connection.sourceHandle === 'no') {
    style.stroke = '#ef4444';
  }

  addEdges([{
    ...connection,
    type: 'deletable',
    style,
    animated: true,
  }]);
};

// Экспорт холста в PDF (только канвас, без боковой панели)
// Временно разворачивает контейнер на весь экран (position:fixed), применяет fitView,
// захватывает скриншот и восстанавливает всё обратно
const exportToPdf = async () => {
  const container = document.getElementById('pdf-capture-zone');
  if (!container) return;

  // 1. Запоминаем текущее положение viewport'а и исходные стили контейнера
  const savedViewport = getViewport();
  const savedStyle = {
    position: container.style.position,
    top: container.style.top,
    left: container.style.left,
    width: container.style.width,
    height: container.style.height,
    zIndex: container.style.zIndex,
    overflow: container.style.overflow,
  };

  // 2. Временно разворачиваем контейнер на весь экран, чтобы html2canvas ничего не обрезал
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '99999',
    overflow: 'visible',
  });

  // 3. Подгоняем все узлы в видимую область со щедрым отступом
  await fitView({ padding: 0.5 });

  // 4. Ждём завершения анимации перехода Vue Flow
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 300));

  // 5. Захватываем скриншот в высоком разрешении (scale 6 = 6 физических пикселей на 1 CSS-пиксель)
  const canvas = await html2canvas(container, { useCORS: true, scale: 6, backgroundColor: '#f8f9fa' });

  // 6. Восстанавливаем исходный viewport и стили контейнера
  setViewport(savedViewport, { duration: 0 });
  Object.assign(container.style, savedStyle);

  // 7. Генерируем PDF с кастомным размером страницы под реальное разрешение canvas (150 DPI)
  const imgData = canvas.toDataURL('image/png');
  const pxPerMm = 150 / 25.4; // 150 DPI → пикселей на миллиметр
  const pdfWidth = canvas.width / pxPerMm;
  const pdfHeight = canvas.height / pxPerMm;

  const pdf = new jsPDF({ orientation: pdfWidth >= pdfHeight ? 'landscape' : 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${props.flowName}.pdf`);
};

// Отправка JSON-графа в ProjectFlowController@store
const saveFlowData = () => {
  const payload = {
    id: props.flowId,
    name: props.flowName,
    type: props.flowType,
    graph_data: { nodes: nodes.value, edges: edges.value },
  };

  axios.post(route('projects.flows.store', props.projectHash), payload)
    .then(() => emit('saved'))
    .catch((err) => {
      console.error('Ошибка сохранения схемы:', err);
    });
};
</script>

<!-- Стили Vue Flow ДОЛЖНЫ быть НЕ-scoped — иначе внутренний DOM библиотеки их не получает -->
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';

/* Увеличенные круги-хэндлы (точки соединения) */
.vue-flow__handle {
  width: 18px !important;
  height: 18px !important;
  border-radius: 50% !important;
  border: 2px solid #fff !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
  cursor: crosshair !important;
  transition: transform 0.15s ease !important;
}
.vue-flow__handle:hover {
  transform: scale(1.5) !important;
}
.vue-flow__handle.connectable {
  cursor: crosshair !important;
}

/* Хэндлы условий — цветные и заметные */
.vue-flow__handle[data-handleid="yes"] {
  background-color: #22c55e !important;
  border-color: #16a34a !important;
  width: 22px !important;
  height: 22px !important;
}
.vue-flow__handle[data-handleid="no"] {
  background-color: #ef4444 !important;
  border-color: #dc2626 !important;
  width: 22px !important;
  height: 22px !important;
}
</style>

<style scoped>
.custom-flow-grid {
  background-color: #f8f9fa;
  width: 100%;
  height: 100%;
}
.draggable-block {
  transition: all 0.2s ease;
  user-select: none;
}
.draggable-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.08) !important;
}

/* Иконка перетаскивания — отступ справа */
.drag-icon {
  margin-left: 8px;
  flex-shrink: 0;
}

/* Боковая панель */
.sidebar-panel {
  width: 260px;
  overflow-y: auto;
  z-index: 5;
  flex-shrink: 0;
}

/* Кнопка fullscreen */
.sidebar-toggle-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #878a99;
  cursor: pointer;
  transition: all 0.15s ease;
}
.sidebar-toggle-btn:hover {
  background: rgba(0,0,0,0.06);
  color: #405189;
}

/* Полноэкранный режим ВСЕГО контейнера */
.flow-workspace-container--fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 9999 !important;
  border-radius: 0 !important;
  border: none !important;
}

/* Стили для маленьких контейнеров иконок в боковой панели */
.icon-shape {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

/* Фирменные полупрозрачные фоны Velzon */
.bg-soft-warning {
  background-color: rgba(247, 184, 75, 0.12) !important;
}
.bg-soft-primary {
  background-color: rgba(64, 81, 137, 0.12) !important;
}
.bg-soft-success {
  background-color: rgba(45, 203, 115, 0.12) !important;
}

.tracking-wider {
  letter-spacing: 0.03em;
}

/* Принудительно возвращаем видимость иконкам управления (конфликт с глобальными стилями Velzon) */
:deep(.vue-flow__controls-button) {
  background-color: #ffffff !important;
  border-bottom: 1px solid #e9ebec !important;
  color: #495057 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.vue-flow__controls-button:hover) {
  background-color: #f3f6f9 !important;
  color: #405189 !important;
}

:deep(.vue-flow__controls-button svg) {
  width: 14px !important;
  height: 14px !important;
  display: block !important;
  fill: currentColor !important;
}
</style>
