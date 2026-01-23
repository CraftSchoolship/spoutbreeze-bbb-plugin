import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import SampleStreamButtonPluginItem from './components/sample-stream-button-plugin-item/component';

const uuid = document.currentScript?.getAttribute('uuid') || 'root';
const pluginName = document.currentScript?.getAttribute('pluginName') || 'plugin';

const root = ReactDOM.createRoot(document.getElementById(uuid));
root.render(
  <SampleStreamButtonPluginItem
    {...{
      pluginName,
      pluginUuid: uuid,
    }}
  />,
);
