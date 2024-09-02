<script setup lang="ts" generic="T extends any">
defineOptions({
  inheritAttrs: true,
});

const loading = defineModel<boolean>("loading", { default: false });
const success = defineModel<boolean>("success", { default: false });

const props = defineProps<{
  disabled?: boolean;
  callback?: (event: MouseEvent) => Promise<T>;
}>();

const emit = defineEmits<{
  /** Pass the click event through with a different name to avoid misuse */
  clickStart: [MouseEvent];
  click: never;
  /** Only emitted on successful callback. Will not be emitted if callback is not passed as prop */
  success: [T];
  /** Only emitted on failed callback. Will not be emitted if callback is not passed as prop */
  fail: [any];
}>();

const onClick = async (event: MouseEvent) => {
  loading.value = true;
  emit("clickStart", event);
  if (props.callback) {
    success.value = false;
    try {
      const res = await props.callback(event);
      success.value = true;
      emit("success", res);
    } catch (error) {
      success.value = false;
      emit("fail", error);
      throw error;
    }
  }
  loading.value = false;
};
</script>

<template>
  <button type="button" class="loading-button" @click="onClick" :disabled="disabled || loading">
    <transition name="v-btn-label" mode="out-in">
      <div v-if="loading">
        <span class="spinner"></span>
      </div>
      <svg v-else-if="success" width="36" height="36" viewBox="0 0 36 36">
        <path fill="#fff" d="M13.5 24.26L7.24 18l-2.12 2.12 8.38 8.38 18-18-2.12-2.12z" />
      </svg>
      <span v-else>
        <slot></slot>
      </span>
      <template v-if="loading">
        <slot name="spinner" class="loading-button-spinner">
          <span class="spinner" />
        </slot>
      </template>
      <template v-else-if="success">
        <slot name="success" class="loading-button-success">
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            style="filter: drop-shadow(2px 3px 6px rgba(0, 0, 0, 0.4))"
          >
            <path fill="#fff" d="M13.5 24.26L7.24 18l-2.12 2.12 8.38 8.38 18-18-2.12-2.12z" />
          </svg>
        </slot>
      </template>
      <template v-else><slot></slot></template>
    </transition>
  </button>
</template>

<style scoped>
button.loading-button {
  /* min-width: 170px;
    min-height: 42px; */
  /* padding: 0 14px; */
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  /* font-weight: 500; */
  /* color: white; */
  /* box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 
                0 4px 6px -2px rgba(0, 0, 0, 0.05); */
  /* transition: background-color 120ms; */
  overflow: hidden;
}
.v-btn-label-enter-active {
  animation: slide-in-down 260ms cubic-bezier(0, 0, 0.2, 1);
}

.v-btn-label-leave-active {
  animation: slide-out-down 260ms cubic-bezier(0.4, 0, 1, 1);
}
</style>
