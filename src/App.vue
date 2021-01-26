<template>
  <div>
    <div id="app">{{ age }}</div>
    <div id="app">{{ getAge }}</div>
    <button @click="$store.commit('changeAge', 1)">commit</button>
    <button @click="$store.dispatch('changeAge', 2)">dispatch</button>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "./vuex";
export default {
  name: "App",
  computed: {
    ...mapState(["age"]),
    ...mapGetters(["getAge"])
  },
  methods: {
    ...mapMutations(["changeAge"]),
    ...mapActions(["changeAge"])
  }
};
</script>
