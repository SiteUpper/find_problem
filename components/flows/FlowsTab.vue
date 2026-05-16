<template>
  <div class="h-100 d-flex flex-column">
    <!-- Режим списка схем -->
    <div v-if="!selectedFlow" class="flex-grow-1">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h6 class="fw-semibold text-uppercase fs-11 text-muted mb-0 tracking-wider">
          <i class="ri-node-tree me-1 align-middle"></i> Сохранённые блок-схемы
        </h6>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-soft-primary" @click="createFlow('diagram')">
            <i class="ri-mind-map me-1"></i> Новая диаграмма
          </button>
          <button class="btn btn-sm btn-soft-success" @click="createFlow('automation')">
            <i class="ri-robot-2-line me-1"></i> Новая автоматизация
          </button>
        </div>
      </div>

      <!-- Список схем -->
      <div v-if="flows.length > 0" class="list-group list-group-flush">
        <div
          v-for="flow in flows"
          :key="flow.id"
          class="list-group-item d-flex align-items-center justify-content-between px-3 py-2.5 border-dashed"
        >
          <div class="d-flex align-items-center gap-2 flex-grow-1 min-w-0" style="cursor: pointer;" @click="openFlow(flow)">
            <div class="flex-shrink-0">
              <span v-if="flow.type === 'diagram'" class="badge bg-primary-subtle text-primary rounded p-1.5">
                <i class="ri-mind-map fs-15 lh-1"></i>
              </span>
              <span v-else class="badge bg-success-subtle text-success rounded p-1.5">
                <i class="ri-robot-2-line fs-15 lh-1"></i>
              </span>
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex align-items-center gap-2">
                <span class="fw-medium fs-13 text-dark text-truncate">{{ flow.name }}</span>
                <span class="badge fs-10" :class="flow.type === 'diagram' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'">
                  {{ flow.type === 'diagram' ? 'Диаграмма' : 'Автоматизация' }}
                </span>
              </div>
              <small class="text-muted fs-11">
                {{ formatDate(flow.created_at) }}
              </small>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2 flex-shrink-0">
            <!-- Переключатель активности (только для automation) -->
            <div v-if="flow.type === 'automation'" class="d-flex align-items-center gap-2">
              <div class="form-check form-switch mb-0">
                <input
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  :checked="flow.is_active"
                  @change.stop="toggleActive(flow)"
                >
              </div>

              <!-- Контейнер для точки статуса -->
              <div class="status-indicator-block">
                <span
                  class="status-dot-static"
                  :class="flow.is_active ? 'bg-success' : 'bg-danger'"
                ></span>
                <!-- Сама пульсирующая волна (рендер только если активен) -->
                <span v-if="flow.is_active" class="status-dot-pulse bg-success"></span>
              </div>

              <span class="fs-13 fw-medium">
                {{ flow.is_active ? 'Активен' : 'Отключен' }}
              </span>
            </div>

            <button class="btn btn-sm btn-icon btn-soft-danger" title="Удалить схему" @click.stop="deleteFlow(flow)">
              <i class="ri-delete-bin-line fs-14"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Пустое состояние -->
      <div v-else class="text-center py-5 text-muted">
        <i class="ri-node-tree fs-24 d-block mb-2 opacity-50"></i>
        <span class="fs-13">Нет сохранённых схем. Создайте первую блок-схему или автоматизацию.</span>
      </div>

      <!-- Индикатор загрузки -->
      <div v-if="loading" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>
    </div>

    <!-- Режим рабочей области -->
    <FlowWorkspace
      v-else
      :flow-id="selectedFlow.id"
      :flow-name="selectedFlow.name"
      :flow-type="selectedFlow.type"
      :initial-data="selectedFlow.graph_data || {}"
      :project-statuses="projectStatuses"
      :project-members="projectMembers"
      :project-hash="projectHash"
      @back="selectedFlow = null; loadFlows()"
      @saved="onFlowSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';
import FlowWorkspace from './FlowWorkspace.vue';

const props = defineProps({
  projectHash: { type: String, required: true },
  projectStatuses: { type: Array, default: () => [] },
  projectMembers: { type: Array, default: () => [] },
});

const flows = ref([]);
const selectedFlow = ref(null);
const loading = ref(false);

const loadFlows = async () => {
  loading.value = true;
  try {
    const { data } = await axios.get(route('projects.flows.index', props.projectHash));
    flows.value = data.flows || [];
  } catch (err) {
    console.error('Ошибка загрузки схем:', err);
  } finally {
    loading.value = false;
  }
};

const createFlow = (type) => {
  Swal.fire({
    title: type === 'diagram' ? 'Новая диаграмма' : 'Новая автоматизация',
    text: 'Введите название схемы',
    input: 'text',
    inputPlaceholder: 'Название блок-схемы',
    showCancelButton: true,
    confirmButtonText: 'Создать',
    cancelButtonText: 'Отмена',
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return 'Название обязательно!';
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      selectedFlow.value = {
        id: null,
        name: result.value.trim(),
        type: type,
        graph_data: null,
      };
    }
  });
};

const openFlow = async (flow) => {
  loading.value = true;
  try {
    const { data } = await axios.get(route('flows.show', flow.id));
    selectedFlow.value = data.flow;
  } catch (err) {
    console.error('Ошибка загрузки схемы:', err);
    Swal.fire('Ошибка', 'Не удалось загрузить схему', 'error');
  } finally {
    loading.value = false;
  }
};

const toggleActive = async (flow) => {
  try {
    const { data } = await axios.patch(route('flows.toggle', flow.id));
    flow.is_active = data.is_active;
  } catch (err) {
    console.error('Ошибка переключения активности:', err);
  }
};

const deleteFlow = (flow) => {
  Swal.fire({
    title: 'Удалить схему?',
    text: `Схема «${flow.name}» будет удалена без возможности восстановления.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Удалить',
    cancelButtonText: 'Отмена',
    confirmButtonColor: '#dc3545',
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await axios.delete(route('flows.destroy', flow.id));
        flows.value = flows.value.filter((f) => f.id !== flow.id);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Схема удалена', timer: 2000, showConfirmButton: false });
      } catch (err) {
        console.error('Ошибка удаления схемы:', err);
        Swal.fire('Ошибка', 'Не удалось удалить схему', 'error');
      }
    }
  });
};

const onFlowSaved = () => {
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Схема сохранена', timer: 2000, showConfirmButton: false });
  selectedFlow.value = null;
  loadFlows();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  loadFlows();
});
</script>

<style scoped>
.list-group-item {
  border-left: none;
  border-right: none;
}
.badge {
  font-weight: 500;
}

/* Базовый контейнер для позиционирования волны */
.status-indicator-block {
  position: relative;
  width: 10px;
  height: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Статичная центральная точка */
.status-dot-static {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 2;
}

/* Пульсирующая внешняя волна */
.status-dot-pulse {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 1;
  animation: statusPulse 2s infinite ease-out;
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
</style>
