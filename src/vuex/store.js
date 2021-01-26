import applyMixin from "./mixin";
// import { forEach } from "./util";
import moduleCollection from "./module/module-collection";
import { forEach } from "./util";

let Vue; // eslint-disable-line no-unused-vars

function getState(store, path) {
  return path.reduce((newState, current) => {
    return newState[current];
  }, store.state);
}

/**
 *
 * @param {*} store 实例
 * @param {*} rootState 根状态
 * @param {*} path 路径
 * @param {*} module 模块
 */
function installModule(store, rootState, path, module) {
  // 注册事件时，需要注册到对应的命名空间中，path就是所有的路径 根据path算出一个空间里
  let namespace = store._modules.getNamespace(path);
  console.log("namespace", namespace);
  // 如果是子模块 需要将子模块的状态定义到根模块上
  if (path.length > 0) {
    let parent = path.slice(0, -1).reduce((memo, current) => {
      return memo[current];
    }, rootState);
    // Vue.set 这个api 可以新增属性 如果本身对象不是响应式会直接复制
    store._withCommitting(() => {
      Vue.set(parent, path[path.length - 1], module.state);
    });
  }
  module.forEachMutation((mutation, type) => {
    store._mutations[namespace + type] =
      store._mutations[namespace + type] || [];
    store._mutations[namespace + type].push(payload => {
      // 内部可能会替换状态，这里如果一直使用module.state，可能就是老的状态
      store._withCommitting(() => {
        mutation.call(store, getState(store, path), payload); // 这里更改状态
      });

      // 调用订阅的事件，重新执行
      store._subscribers.forEach(sub => sub({ mutation, type }, store.state));
    });
  });
  module.forEachAction((action, type) => {
    store._actions[namespace + type] = store._actions[namespace + type] || [];
    store._actions[namespace + type].push(payload => {
      action.call(store, store, payload);
    });
  });
  module.forEachGetters((getter, key) => {
    // 如果getters 重名会覆盖，所有的模块的getters 都会定义到根模块上
    store._wrapperGetters[namespace + key] = function() {
      return getter(getState(store, path));
    };
  });
  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child);
  });
}

function resetStoreVm(store, state) {
  const wrapperGetters = store._wrapperGetters;
  let oldVm = store._vm;

  let computed = {};
  store.getters = {};
  // 2.让getters 定义在store上
  forEach(wrapperGetters, (fn, key) => {
    // 通过computed实现缓存效果
    computed[key] = function() {
      return fn();
    };
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key]
    });
  });
  // 1.实现让状态变成响应式
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  });

  if (store.strict) {
    // 只要状态变化会立即执行,在状态变化后同步执行
    store._vm.$watch(
      () => store._vm._data.$$state,
      () => {
        console.assert(store._committing, "在mutation之外更改了 state");
      },
      { deep: true, sync: true }
    );
  }
  // 销毁老的实例
  if (oldVm) {
    Vue.nextTick(() => oldVm.$destroy());
  }
}
class Store {
  constructor(options) {
    // 格式化用户传入的参数，格式化成树形结构 更直观一些，后续也更好操作一些
    // 1.收集模块转换成一棵树
    this._modules = new moduleCollection(options);
    console.log("this._modules", this._modules);
    let state = this._modules.root.state;
    // 存放所有模块中的motations
    this._mutations = {};
    // 存放所有模块中的actions
    this._actions = {};
    // 存放所有模块中的getters
    this._wrapperGetters = {};
    this._subscribers = [];
    // 严格模式
    this.strict = options.strict;

    // 同步的watcher
    this._committing = false;
    // 2.安装模块 将模块上的属性定义到store中

    installModule(this, state, [], this._modules.root);

    // 将状态放到vue的实例中
    resetStoreVm(this, state);

    // 插件的实现
    options.plugins.forEach(plugin => plugin(this));
    // let state = options.state; // 用户传递过来的状态
    // // 如果直接将state定义在实例上，稍后这个状态发生改变 视图是不会更新的
    // this.getters = {};
    // const computed = {};
    // // getters: 其实写的时方法，但是取值的时候时属性
    // forEach(options.getters, (fn, key) => {
    //   computed[key] = () => {
    //     return fn(this.state);
    //   };
    //   Object.defineProperty(this.getters, key, {
    //     get: () => this._vm[key]
    //   });
    // });
    // // defineReactive => vue-router 只定义了一个属性
    // // vue 中定义数据 属性名是有特点的 如果属性名是通过 $xxx命名的 他不会被代理到vue 的实例上
    // this._vm = new Vue({
    //   data: {
    //     // 内部的状态
    //     $$state: state
    //   },
    //   // 计算属性会将自己的属性放到实例上
    //   computed
    // });
    // // 发布订阅模式 将用户定义的mutation 和 action 先保存起来，然后 当调用commit时 就找订阅的motation方法，调用dispatch 就找对应的action方法
    // this._mutations = {};
    // forEach(options.mutations, (fn, key) => {
    //   this._mutations[key] = payload => fn.call(this, this.state, payload);
    // });
    // this._actions = {};
    // forEach(options.actions, (fn, key) => {
    //   this._actions[key] = payload => fn.call(this, this, payload);
    // });
  }
  _withCommitting(fn) {
    let committing = this._committing;
    // 在函数调用前 表示 _committing为true
    this._committing = true;
    fn();
    this._committing = committing;
  }
  subscribe(fn) {
    this._subscribers.push(fn);
  }
  // 用最新的状态替换掉
  replaceState(newState) {
    this._withCommitting(() => {
      this._vm._data.$$state = newState;
    });
  }
  commit = (type, payload) => {
    this._mutations[type].forEach(fn => fn(payload));
  };
  dispatch = (type, payload) => {
    this._actions[type].forEach(fn => fn(payload));
  };
  // 类的属性访问器，当用户去实例上取state属性时，会执行此方法
  get state() {
    return this._vm._data.$$state;
  }
  registerModule(path, rawModule) {
    // path 需要是一个数组
    if (typeof path == "string") path = [path];
    // 模块注册
    this._modules.register(path, rawModule);
    // 安装模块 动态的将状态新增上去
    installModule(this, this.state, path, rawModule.rawModule);
    // 重新定义 getters
    resetStoreVm(this, this.state);
  }
}

const install = _Vue => {
  Vue = _Vue;
  applyMixin(Vue);
};

export { Store, install };
