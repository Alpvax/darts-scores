import { inject as vueInject, type InjectionKey } from "vue";
import type { InjectableType } from "./index";

export const menuInjectionKey = Symbol("contextMenu injection key") as InjectionKey<InjectableType>;

export const menuItemsKey = Symbol("contextMenu items injection key") as InjectionKey<
  InjectableType["items"]
>;
export const menuOpenKey = Symbol("contextMenu open injection key") as InjectionKey<
  InjectableType["open"]
>;
export const menuCloseKey = Symbol("contextMenu close injection key") as InjectionKey<
  InjectableType["close"]
>;

export const inject = () => vueInject(menuInjectionKey)!;
export const injectItems = () => vueInject(menuItemsKey)!;
export const injectOpen = () => vueInject(menuOpenKey)!;
export const injectClose = () => vueInject(menuCloseKey)!;
