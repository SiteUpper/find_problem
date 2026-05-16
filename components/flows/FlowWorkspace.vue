<template>
  <div class="flow-workspace-container d-flex flex-column h-100 bg-white border rounded-3 position-relative">
    <!-- Верхний тулбар управления холстом -->
    <div class="d-flex align-items-center justify-content-between p-3 border-bottom bg-light bg-opacity-50">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('back')">
          <i class="ri-arrow-left-line me-1"></i> Назад к списку
        </button>
        <h5 class="mb-0 fw-semibold text-dark">{{ flowName }}</h5>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-danger" @click="exportToPdf">
          <i class="ri-file-pdf-line me-1"></i> Скачать PDF
        </button>
        <button class="btn btn-sm btn-success" @click="saveFlowData">
          <i class="ri-save-line me-1"></i> Сохранить схему
        </button>
      </div>
    </div>

    <!-- Основная рабочая зона: Сетка слева, Панель блоков справа -->
    <div class="d-flex flex-grow-1 position-relative overflow-hidden" id="pdf-capture-zone">
      <!-- Холст Vue Flow -->
      <div class="flex-grow-1 h-100 position-relative" @drop="onDrop" @dragover.prevent>
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :fit-view-on-init="true"
          @connect="onConnect"
          class="custom-flow-grid"
        >
          <Background pattern-color="#aaa" :gap="16" />
          <Controls position="bottom-left" />
        </VueFlow>
      </div>

      <!-- Боковая No-code панель доступных блоков робота -->
      <div v-if="flowType === 'automation'" class="border-start bg-light p-3" style="width: 240px;">
        <h6 class="fw-semibold text-uppercase fs-11 text-muted tracking-wider mb-3">Элементы робота</h6>

        <div class="d-flex flex-column gap-2">
          <!-- Блок 1: Триггер (Событие) -->
          <div class="draggable-block bg-white p-2.5 border border-warning border-opacity-50 rounded-3 shadow-sm cursor-move d-flex align-items-center gap-2 fs-13 text-dark fw-medium"
               draggable="true" @dragstart="onDragStart($event, 'custom-trigger')">
            <div class="icon-shape bg-soft-warning text-warning rounded-2 d-flex align-items-center justify-content-center p-1">
              <i class="ri-flashlight-fill fs-16"></i>
            </div>
            <span>1. Событие (Триггер)</span>
          </div>

          <!-- Блок 2: Условие (Фильтр) -->
          <div class="draggable-block bg-white p-2.5 border border-primary border-opacity-50 rounded-3 shadow-sm cursor-move d-flex align-items-center gap-2 fs-13 text-dark fw-medium"
               draggable="true" @dragstart="onDragStart($event, 'custom-condition')">
            <div class="icon-shape bg-soft-primary text-primary rounded-2 d-flex align-items-center justify-content-center p-1">
              <i class="ri-git-merge-fill fs-16"></i>
            </div>
            <span>2. Если Условие</span>
          </div>

          <!-- Блок 3: Действие (Экшен) -->
          <div class="draggable-block bg-white p-2.5 border border-success border-opacity-50 rounded-3 shadow-sm cursor-move d-flex align-items-center gap-2 fs-13 text-dark fw-medium"
               draggable="true" @dragstart="onDragStart($event, 'custom-action')">
            <div class="icon-shape bg-soft-success text-success rounded-2 d-flex align-items-center justify-content-center p-1">
              <i class="ri-settings-5-fill fs-16"></i>
            </div>
            <span>3. Действие робота</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, markRaw } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import CustomNode from './nodes/CustomNode.vue';
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

const { project } = useVueFlow({ id: 'flow-canvas' });

// Регистрируем кастомный узел
const nodeTypes = {
  'custom-trigger': markRaw(CustomNode),
  'custom-condition': markRaw(CustomNode),
  'custom-action': markRaw(CustomNode),
};

const nodes = ref(props.initialData?.nodes || []);
const edges = ref(props.initialData?.edges || []);

// Логика Drag-and-Drop элементов на холст
const onDragStart = (event, nodeType) => {
  event.dataTransfer.setData('application/vueflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const onDrop = (event) => {
  const type = event.dataTransfer.getData('application/vueflow');
  if (!type) return;

  const position = project({ x: event.clientX, y: event.clientY });

  const newNode = {
    id: `node_${Date.now()}`,
    type,
    position,
    label: 'Новый элемент',
    data: {
      statuses: props.projectStatuses,
      members: props.projectMembers,
      field: 'priority',
      operator: '=',
      value: '',
    },
  };

  nodes.value.push(newNode);
};

// Обработчик создания связи (стрелочки) между узлами
// sourceHandle = 'yes' -> зелёная стрелка, 'no' -> красная
const onConnect = (connection) => {
  const style = {};

  if (connection.sourceHandle === 'yes') {
    style.stroke = '#22c55e';
  } else if (connection.sourceHandle === 'no') {
    style.stroke = '#ef4444';
  }

  edges.value.push({
    ...connection,
    style,
    animated: true,
  });
};

// Экспорт холста в PDF
const exportToPdf = async () => {
  const element = document.getElementById('pdf-capture-zone');
  if (!element) return;

  const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('l', 'mm', 'a4');
  const imgWidth = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
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

<style scoped>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

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
</style>
