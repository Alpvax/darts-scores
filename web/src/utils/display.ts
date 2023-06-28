import { Ref } from "vue";


export type RowMetadata = {
  label: string;
  slotId: string;
  width?: number;
  additionalClass?: string[];
  showIf?: Ref;
  onClick?: (event: MouseEvent) => any;
};
