<template>
  <div class="custom-node-card card border shadow-sm rounded-3 bg-white text-dark p-2 position-relative" style="width: 240px; border-top-width: 3px !important; overflow: visible !important;" :class="getNodeBorderClass">

    <!-- Кнопка удаления внутри карточки — позиционируется относительно самой карточки -->
    <button
      class="btn-delete-node nodrag nopan"
      @pointerdown.stop
      @click.stop="$emit('delete')"
      title="Удалить элемент"
    >×</button>

    <!-- 1. Интерфейс ТРИГГЕРА -->
    <div v-if="type === 'custom-trigger'">
      <div class="d-flex align-items-center gap-2 mb-2 pb-1.5 border-bottom border-light">
        <div class="avatar-xxs rounded bg-soft-warning text-warning d-flex align-items-center justify-content-center p-1">
          <i class="ri-flashlight-fill fs-13"></i>
        </div>
        <span class="fs-11 fw-semibold text-uppercase text-warning tracking-wider">1. Триггер запуска</span>
      </div>

      <label class="fs-11 text-muted mb-1 d-block">Если статус задачи стал:</label>
      <select v-model="data.status_id" class="form-select form-select-sm fs-12 nodrag nopan nowheel" @pointerdown.stop>
        <option v-for="s in data.statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <Handle type="source" position="right" />
    </div>

    <!-- 2. Интерфейс УСЛОВИЯ (Фильтра) -->
    <div v-if="type === 'custom-condition'">
      <div class="d-flex align-items-center gap-2 mb-2 pb-1.5 border-bottom border-light">
        <div class="avatar-xxs rounded bg-soft-primary text-primary d-flex align-items-center justify-content-center p-1">
          <i class="ri-git-merge-fill fs-13"></i>
        </div>
        <span class="fs-11 fw-semibold text-uppercase text-primary tracking-wider">2. Проверить фильтр</span>
      </div>

      <div class="d-flex flex-column gap-1">
        <select v-model="data.field" class="form-select form-select-sm fs-11 nodrag nopan nowheel" @pointerdown.stop>
          <option value="priority">Приоритет</option>
          <option value="budget">Бюджет (число)</option>
        </select>
        <select v-model="data.operator" class="form-select form-select-sm fs-11 nodrag nopan nowheel" @pointerdown.stop>
          <option value="=">Равно</option>
          <option value=">">Больше чем</option>
        </select>
        <input v-if="data.field === 'budget'" type="number" v-model="data.value" class="form-control form-control-sm fs-11 nodrag nopan nowheel" @pointerdown.stop placeholder="Сумма">
        <select v-else v-model="data.value" class="form-select form-select-sm fs-11 nodrag nopan nowheel" @pointerdown.stop>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
      </div>
      <Handle type="target" position="left" />
      <Handle type="source" position="right" id="yes" style="background: #22c55e; top: 40%;" />
      <Handle type="source" position="bottom" id="no" style="background: #ef4444;" />
    </div>

    <!-- 3. Интерфейс ДЕЙСТВИЯ (Экшена робота) -->
    <div v-if="type === 'custom-action'">
      <div class="d-flex align-items-center gap-2 mb-2 pb-1.5 border-bottom border-light">
        <div class="avatar-xxs rounded bg-soft-success text-success d-flex align-items-center justify-content-center p-1 position-relative">
          <i class="ri-settings-5-fill fs-13"></i>
          <!-- Маленькая пульсирующая точка в углу иконки -->
          <span class="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-white rounded-circle">
            <span class="pulse-wave-mini"></span>
          </span>
        </div>
        <span class="fs-11 fw-semibold text-uppercase text-success tracking-wider">3. Действие робота</span>
      </div>

      <select v-model="data.type" class="form-select form-select-sm fs-12 mb-1.5 nodrag nopan nowheel" @pointerdown.stop>
        <option value="create_subtask">Создать подзадачу</option>
        <option value="change_owner">Сменить ответственного</option>
      </select>

      <div v-if="data.type === 'create_subtask'">
        <input type="text" v-model="data.task_name" class="form-control form-control-sm fs-11 mb-1 nodrag nopan nowheel" @pointerdown.stop placeholder="Название подзадачи">
        <select v-model="data.user_id" class="form-select form-select-sm fs-11 nodrag nopan nowheel" @pointerdown.stop>
          <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <Handle type="target" position="left" />
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Handle } from '@vue-flow/core';

defineEmits(['delete']);

const props = defineProps({
  id: String,
  type: String,
  data: Object,
});

// Динамический класс для цветной верхней рамки карточки в зависимости от типа
const getNodeBorderClass = computed(() => {
  if (props.type === 'custom-trigger') return 'border-top-warning';
  if (props.type === 'custom-condition') return 'border-top-primary';
  return 'border-top-success';
});
</script>

<style scoped>
/* Стили для маленьких контейнеров иконок */
.icon-shape, .avatar-xxs {
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

/* Верхние рамки для карточек блоков */
.border-top-warning { border-top-color: #f7b84b !important; }
.border-top-primary { border-top-color: #405189 !important; }
.border-top-success { border-top-color: #0ab39c !important; }

.tracking-wider {
  letter-spacing: 0.03em;
}

/* Кнопка удаления узла — красный кружок [×] внутри карточки */
.btn-delete-node {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background-color: #ef4444;
  color: white;
  border: 2px solid white;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 50;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  transition: all 0.15s ease;
  padding: 0;
}
.btn-delete-node:hover {
  background-color: #dc2626;
  transform: scale(1.15);
}

/* Микро-волна для иконок внутри блоков холста */
.pulse-wave-mini {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #0ab39c;
  border-radius: 50%;
  animation: statusPulse 1.8s infinite ease-out;
}

@keyframes statusPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  70% {
    transform: scale(2.8);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.custom-node-card {
  font-size: 12px;
  overflow: visible !important;
}
.form-select-sm,
.form-control-sm {
  font-size: 11px;
  padding: 2px 6px;
  min-height: auto;
}
</style>
