import axios from 'axios';
import assert from 'assert';
import {merge, omit} from 'lodash';
import {info} from './log';
import $url from 'url';

export default class RancherClient {
  var rancherClientErrorCount = 0;

  constructor({address, version='v1', url, protocol='http', auth, projectId}) {
    if (auth) {
      assert(auth.accessKey, '`auth.accessKey` is missing');
      assert(auth.secretKey, '`auth.secretKey` is missing');
      this._auth = {user: auth.accessKey, password: auth.secretKey};
    }

    if (address && !address.match(/^http/)) {
      address = 'http://' + address;
    }

    if (!url) {
      assert(address, '`url` is missing');
      url = (address.match(/^http/) ? address : protocol + '://' + address);
      if (!url.match(/\/v\d+$/)) {
        url += '/' + version
      }
    }

    this.address = url;
    this.projectId = projectId;
  }

  async getCurrentProjectIdAsync() {
    return (await this._request({
      url: `/v1/projects/`
    })).data[0].id;
  }

  async _request(options) {
    assert(options.url);
    try {
      const res = await axios(merge(options, {
        url: this.buildUrl(options.url),
        headers: this._auth ? {
          'Authorization': 'Basic ' + new Buffer(this._auth.user + ':' + this._auth.password).toString('base64')
        } : {},
        responseType: 'json'
      }));

      this.rancherClientErrorCount = 0;
      return res.data
    }
    catch (resp) {
      if (this.rancherClientErrorCount <= 5) {
        info('RancherClientError: non-200 code response ' + JSON.stringify(resp, null, 4));
        this.rancherClientErrorCount += 1;
      } else {
        this.rancherClientErrorCount = 0;
        throw new Error('RancherClientError: non-200 code response ' + JSON.stringify(resp, null, 4));
      }
    }
  }

  async getServices() {
    return (await this._request({
      url: `projects/${this.projectId}/services`
    })).data;
  }

  async getStacks() {
    return (await this._request({
      url: `projects/${this.projectId}/environments`
    })).data;
  }

  async getService(serviceId) {
    return await this._request({
      url: `projects/${this.projectId}/services/${serviceId}`
    });
  }

  async getCurrentEnvironment() {
    return await this._request({
      url: `projects/${this.projectId}`
    });
  }

  async getStack(stackId) {
    return await this._request({
      url: `projects/${this.projectId}/environments/${stackId}`
    });
  }

  async getServiceContainers(serviceId) {
    return (await this._request({
      url: `projects/${this.projectId}/services/${serviceId}/instances`
    })).data;
  }

  buildUrl(path) {
    if (path.startsWith('/')) {
      return $url.resolve(this.address, path);
    } else {
      return this.address + '/' + path
    }

  }

}
