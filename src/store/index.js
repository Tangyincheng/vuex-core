import Vue from "vue";
import Vuex from "../vuex";

// 持久化插件
function persists(store) {
  let local = localStorage.getItem("VUEX:STATE");
  if (local) {
    store.replaceState(JSON.parse(local));
  }
  store.subscribe((mutation, state) => {
    localStorage.setItem("VUEX:STATE", JSON.stringify(state));
  });
}

Vue.use(Vuex);

// 跨组件通信
let Store = new Vuex.Store({
  // 内部会创造一个vue实例，通信用的
  strict: true, //严格模式下只能通过 mutation 来更改状态
  plugins: [persists],
  // 内部会创造一个vue实例，通信用
  state: {
    // 组件的状态
    age: 28
  },
  getters: {
    // 获取 计算属性 new Vue(computed) 依赖 当依赖的值变化后会重新执行
    getAge(state) {
      // 如果返回的结果相同，不会重新执行这个函数
      // 如果age属性不发生变化 就不会重新执行
      return state.age + 10;
    }
  },
  mutations: {
    // vue 中的方法 唯一可以改状态的方法
    changeAge(state, payload) {
      // 同步
      state.age += payload;
    }
  },
  actions: {
    // 通过action中发起请求
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit("changeAge", payload);
      }, 1000);
    }
  },
  modules: {
    a: {
      namespaced: true,
      state: {
        c: 100
      },
      mutations: {
        changeAge() {
          console.log("c更新 ");
        }
      }
    },
    b: {
      namespaced: true,
      state: {
        d: 100
      },
      mutations: {
        changeAge() {
          console.log("d更新 ");
        }
      },
      modules: {
        c: {
          namespaced: true,
          state: {
            e: 400
          },
          mutations: {
            changeAge() {
              console.log("d更新 ");
            }
          }
        }
      }
    }
  }
});

// 新增注册
Store.registerModule(["b", "f"], {
  state: {
    haha: 200
  },
  namespaced: true
});

// 1.默认模块没有 作用域问题
// 2.状态不要和模块的名字相同
// 3.默认计算属性 直接通过getters取值
// 4.如果增加namespaced:true 会将这个模块的属性 都封装到这个作用域下
// 5.默认会找当前模块上是否有namespace，并且将父级的namespace一同算上，做成命名空间

export default Store;
