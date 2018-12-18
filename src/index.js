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
  triggerExecute() {
    if (!this.executeQueue.length) {
      return;
    }

    const availableConfigs = this.executeQueue
      .map(handle => {
        return this.executeHandleDict[handle];
      })
      .filter(item => !!item);

    const resultPromise = availableConfigs.reduce(
      (prevPromise, { config, config: { callback }, cancelSource, handle }) => {
        return prevPromise.then(prevResults => {
          return axios(config, {
            cancelToken: cancelSource.token
          })
            .then(response => {
              this.clear(handle);
              callback &&
                callback.call(this, null, response, () => {
                  availableConfigs.splice(1);
                  return [...prevResults, response];
                });
              return [...prevResults, response];
            })
            .catch(error => {
              this.clear(handle);
              callback &&
                callback.call(this, error, null, () => {
                  availableConfigs.splice(1);
                  return [...prevResults, response];
                });
              return [...prevResults, error];
            });
        });
      },
      Promise.resolve([])
    );
    resultPromise.then(results => {
      console.log(results);
    });
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
      const handle = _.uniqueId();

      this.executeHandleDict[handle] = {
        cancelSource: CancelToken.source(),
        config,
        handle
      };
      this.executeQueue.push(handle);
    });
    this.triggerExecute();
  }
}

window.d = new AxiosDispatcher();

window.d.feed([
  {
    url: "https://reqres.in/api/users?delay=3",
    method: "GET",
    callback: (error, result, stop) => {
      stop();
    }
  },
  {
    url: "https://reqres.in/api/users?delay=3",
    method: "GET"
  },
  {
    url: "https://reqres.in/api/users?delay=3",
    method: "GET"
  },
  {
    url: "https://reqres.in/api/users?delay=3",
    method: "GET"
  },
  {
    url: "https://reqres.in/api/users?delay=3",
    method: "GET"
  }
]);
