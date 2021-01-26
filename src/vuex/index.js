//  主文件的作用一般就是整合操作
import { Store, install } from "./store";

import { mapState, mapGetters, mapMutations, mapActions } from "./helpers";
// 两种方式都可以 可以采用默认导入，也可以采用 解构使用
export default {
  Store,
  install,
  mapState,
  mapGetters,
  mapMutations,
  mapActions
};

export { Store, install, mapState, mapGetters, mapMutations, mapActions };
