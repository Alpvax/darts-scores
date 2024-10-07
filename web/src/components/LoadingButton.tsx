import { defineComponent, ref, useAttrs, watch, type FunctionalComponent } from "vue";

export const LoadingButton: FunctionalComponent<
  {
    loading: boolean;
    success?: boolean;
    disabled?: boolean;
  },
  {
    click: (event: MouseEvent) => void;
  },
  {
    default?: any;
    loading?: any;
    success?: any;
  }
> = (props, { emit, slots }) => (
  <button
    type="button"
    class="loading-button"
    onClick={(e) => emit("click", e)}
    disabled={props.disabled || props.loading}
  >
    {/*<transition name="v-loading-btn-label" mode="out-in">*/}
    {props.loading ? (
      typeof slots.loading === "function" ? (
        slots.loading()
      ) : (
        <span class="spinner loading-button-spinner"></span>
      )
    ) : props.success ? (
      typeof slots.success === "function" ? (
        slots.success()
      ) : (
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          style="filter: drop-shadow(2px 3px 6px rgba(0, 0, 0, 0.4))"
        >
          <path fill="#fff" d="M13.5 24.26L7.24 18l-2.12 2.12 8.38 8.38 18-18-2.12-2.12z" />
        </svg>
      )
    ) : typeof slots.default === "function" ? (
      slots.default()
    ) : (
      "DEFAULT_LABEL_TEXT"
    )}
    {/*</transition>*/}
  </button>
);

LoadingButton.props = {
  loading: { type: Boolean, required: true },
  success: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
};

LoadingButton.emits = {
  click: (event: MouseEvent) => true,
};

export default LoadingButton;
