import type { VNodeChild } from "vue";
import { h } from "vue";

type DisplayFunc<T> = (data: T) => VNodeChild | (T extends number | boolean ? undefined : keyof T);

export type SimpleSummaryRow<T extends number | boolean> = {
  label: string;
  display?: (data: T) => VNodeChild;
};
export type ObjSummaryRow<T extends {}> = {
  label: string;
  display: (data: T) => VNodeChild | keyof T;
};
type SummaryRowPopoverContent<T> =
  | {
      info: string;
      extended?: never;
    }
  | {
      extended: (data: T) => VNodeChild;
      info?: never;
    };
export type SummaryRow<T> = T extends number | boolean
  ?
      | {
          label: string;
          display?: (data: T) => VNodeChild;
          info: string;
        }
      | {
          label: string;
          display?: (data: T) => VNodeChild;
          extended: (data: T) => VNodeChild;
        }
  :
      | {
          label: string;
          display: ((data: T) => VNodeChild) | keyof T;
          info: string;
          extended?: never;
        }
      | {
          label: string;
          display: ((data: T) => VNodeChild) | keyof T;
          extended: (data: T) => VNodeChild;
          info?: never;
        };

export const hasPopover = <T>(
  row: Partial<SummaryRowPopoverContent<T>>,
): row is SummaryRowPopoverContent<T> => hasInfoPopover(row) || hasExtendedPopover(row);
export const hasInfoPopover = <T>(
  row: Partial<SummaryRowPopoverContent<T>>,
): row is {
  info: string;
} => typeof row["info"] === "string";
export const hasExtendedPopover = <T>(
  row: Partial<SummaryRowPopoverContent<T>>,
): row is {
  extended: (data: T) => VNodeChild;
} => typeof row["extended"] === "function";

const test: SummaryRow<{ a: 1; b: 2 }> = {
  label: "test",
  display: (data) => data.a,
  info: "test row popup description",
  extended: (data) => data.b,
};
