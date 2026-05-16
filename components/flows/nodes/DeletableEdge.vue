<template>
  <BaseEdge :id="id" :path="edgePath" :style="edgeStyle" :marker-end="markerEnd" />
  <EdgeLabelRenderer>
    <div
      v-if="highlighted"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all',
        zIndex: 100,
      }"
      class="nodrag nopan"
    >
      <button
        class="edge-delete-btn"
        @pointerdown.stop
        @click.stop="$emit('deleteEdge', id)"
        title="Удалить связь"
      >×</button>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup>
import { computed } from 'vue';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core';

const props = defineProps({
  id: String,
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  selected: Boolean,
  highlighted: Boolean,
  style: Object,
  markerEnd: String,
  animated: Boolean,
  data: Object,
  sourceHandleId: String,
  targetHandleId: String,
});

defineEmits(['deleteEdge']);

// getSmoothStepPath ОБЯЗАН быть реактивным — иначе при перемещении узла линия обрывается
const pathData = computed(() => {
  return getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 5,
  });
});

const edgePath = computed(() => pathData.value[0]);
const labelX = computed(() => pathData.value[1]);
const labelY = computed(() => pathData.value[2]);

const edgeStyle = computed(() => ({
  ...(props.style || {}),
  cursor: 'pointer',
  strokeWidth: props.highlighted ? 3 : 2,
  transition: 'stroke-width 0.15s ease',
}));
</script>

<style scoped>
.edge-delete-btn {
  width: 22px;
  height: 22px;
  background: #ef4444;
  color: white;
  border: 2px solid white;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  transition: all 0.15s ease;
  padding: 0;
}
.edge-delete-btn:hover {
  background: #dc2626;
  transform: scale(1.2);
}
</style>
