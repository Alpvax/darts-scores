import { Ref } from "vue";


export type RowMetadata = {
  label: string;
  slotId: string;
  width?: number;
  additionalClass?: string[];
  showIf?: Ref;
  onClick?: (event: MouseEvent) => any;
};

type RateDisplay = boolean | {
  fixed?: number; when: "always" | "hover" | "never" | Ref<RateDisplay>;
}

export type SummaryField = {
  label: string;
  id: string;
  // /** Whether the best is the lowest value, not the highest */
  // isNegative?: boolean;
  displayRate?: RateDisplay;
  tooltip?: string;
  // displayIngame: Ref<boolean>;
  // displayBest: boolean;
  // displayWorst: boolean;
}
