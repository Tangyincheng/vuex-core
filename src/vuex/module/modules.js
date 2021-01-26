import { forEach } from "../util";

export default class Module {
  constructor(rootModule) {
    this._rawModule = rootModule;
    this._children = {};
    this.state = rootModule.state;
  }
  // 属性访问器
  get namespaced() {
    return this._rawModule.namespaced;
  }
  getChild(key) {
    return this._children[key];
  }
  addChild(key, module) {
    this._children[key] = module;
  }
  // 当前模块的mutations
  forEachMutation(fn) {
    if (this._rawModule.mutations) {
      forEach(this._rawModule.mutations, fn);
    }
  }
  // 当前模块的actions
  forEachAction(fn) {
    if (this._rawModule.actions) {
      forEach(this._rawModule.actions, fn);
    }
  }
  // 当前模块的getters
  forEachGetters(fn) {
    if (this._rawModule.getters) {
      forEach(this._rawModule.getters, fn);
    }
  }
  forEachChild(fn) {
    forEach(this._children, fn);
  }
}
