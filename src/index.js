import axios from "axios";
import _ from "lodash";

const CancelToken = axios.CancelToken;

class AxiosDispatcher {
  constructor() {
    this.executeQueueMaxSize = 10;

    this.waitingQueue = [];
    this.executeQueue = [];
    this.executeHandleDict = {};
  }
  clear(handle) {
    this.executeHandleDict[handle] = null;
    this.executeQueue.splice(
      this.executeQueue.findIndex(item => item === handle),
      1
    );
  }
  feed(config) {
    const configs = _.isArray(config) ? config : [config];
    this.waitingQueue = [...this.waitingQueue, ...configs];

    if (this.executeQueue.length >= this.executeQueueMaxSize) {
      return;
    }

    const remainSize = this.executeQueueMaxSize - this.executeQueue.length;
    const nextRequestRawConfigs = this.waitingQueue.splice(0, remainSize);

    nextRequestRawConfigs.forEach(config => {
      const { callback = new Function() } = config;

      let cancelHandler = null;
      const handle = _.uniqueId();

      axios(config, {
        cancelToken: new CancelToken(function executor(c) {
          cancelHandler = c;
        })
      })
        .then(response => {
          callback(response);
          this.clear(handle);
        })
        .catch(error => {
          callback(null, error);
          this.clear(handle);
        });

      this.executeHandleDict[handle] = {
        cancelHandler,
        config
      };
      this.executeQueue.push(handle);
    });
  }
}

window.d = new AxiosDispatcher();

window.d.feed({
  url: "https://randomuser.me/api/",
  method: "GET"
});
