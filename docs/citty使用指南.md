# 🌆 citty 使用指南（中文备忘）

优雅的 CLI 构建器。

- 零依赖、轻量快速（基于原生 `util.parseArgs`）
- 智能参数解析，支持类型转换与布尔快捷方式
- 嵌套子命令，支持懒加载与异步加载
- 可插拔、可组合的 API，自动生成 usage

## 安装

```sh
bun add citty
```

## 基本用法

```js
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "hello",
    version: "1.0.0",
    description: "My Awesome CLI App",
  },
  args: {
    name: { type: "positional", description: "Your name", required: true },
    friendly: { type: "boolean", description: "Use friendly greeting" },
  },
  setup({ args }) {
    console.log(`now setup ${args.command}`);
  },
  cleanup({ args }) {
    console.log(`now cleanup ${args.command}`);
  },
  run({ args }) {
    console.log(`${args.friendly ? "Hi" : "Greetings"} ${args.name}!`);
  },
});

runMain(main);
```

```sh
node index.mjs john
# Greetings john!
```

## 子命令

子命令可递归嵌套。大型 CLI 建议用懒加载，避免一次性 import 所有命令：

```js
const main = defineCommand({
  meta: { name: "hello", version: "1.0.0", description: "My Awesome CLI App" },
  subCommands: {
    sub: () => import("./sub.mjs").then((m) => m.default),
  },
});
```

- 子命令支持 `meta.alias`（如 `["i", "add"]`）与 `meta.hidden: true`（从帮助中隐藏）
- `meta`、`args`、`subCommands` 均接受 `Resolvable<T>`：直接值、Promise、函数或异步函数，支持懒/动态解析

## Hooks

命令支持 `setup` 与 `cleanup`，分别在 `run()` 前后调用。只有被执行命令的 hooks 会运行；`cleanup` 始终执行（`run()` 抛错也跑）。

## 插件

插件通过可复用的 `setup`/`cleanup` hooks 扩展命令：

```js
import { defineCommand, defineCittyPlugin, runMain } from "citty";

const logger = defineCittyPlugin({
  name: "logger",
  setup({ args }) {
    console.log("Logger setup, args:", args);
  },
  cleanup() {
    console.log("Logger cleanup");
  },
});

const main = defineCommand({
  meta: { name: "hello", description: "My CLI App" },
  plugins: [logger],
  run() {
    console.log("Hello!");
  },
});

runMain(main);
```

插件的 `setup` 在命令自身 `setup` 之前按序执行，`cleanup` 在其后逆序执行。插件可为异步函数或工厂函数。

## 参数

### 参数类型

| 类型         | 说明                              | 示例                        |
| ------------ | --------------------------------- | --------------------------- |
| `positional` | 未命名的位置参数                  | `cli <name>`                |
| `string`     | 命名字符串选项                    | `--name value`              |
| `boolean`    | 布尔开关，支持 `--no-` 取反        | `--verbose`                 |
| `enum`       | 限定在 `options` 数组内取值       | `--level=info\|warn\|error` |

### 通用选项

| 选项         | 说明                                                        |
| ------------ | ----------------------------------------------------------- |
| `description` | 帮助输出中显示的说明文字                                     |
| `required`   | 是否必填                                                    |
| `default`    | 未提供时的默认值                                            |
| `alias`      | 短别名（如 `["f"]`），不适用于 `positional`                  |
| `valueHint`  | 帮助中的取值提示（如 `"host"` 渲染为 `--name=<host>`）       |

### 布尔取反

布尔参数支持 `--no-` 前缀。当 `default: true` 或设置了 `negativeDescription` 时，取反变体会出现在帮助中。

### 大小写无关访问

kebab-case 参数可用 camelCase 访问：`args["output-dir"]` 与 `args.outputDir` 等价。

## 内置 Flag

`--help` / `-h` 与 `--version` / `-v` 自动处理。若命令自定义了同名参数或别名则被禁用。

## API 速查

| 函数                           | 说明                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| `defineCommand(def)`           | 定义命令的类型辅助函数                                        |
| `runMain(cmd, opts?)`          | 运行命令，带 usage 支持与优雅错误处理                         |
| `createMain(cmd)`              | 创建一个调用时执行 `runMain` 的包装器                         |
| `runCommand(cmd, opts)`        | 解析参数并运行命令/子命令，可从返回值取 `result`              |
| `parseArgs(rawArgs, argsDef)`  | 解析输入参数并应用默认值                                      |
| `renderUsage(cmd, parent?)`    | 渲染命令 usage 为字符串                                       |
| `showUsage(cmd, parent?)`      | 渲染 usage 并打印到控制台                                     |
| `defineCittyPlugin(def)`       | 定义插件的类型辅助函数                                        |

## 本项目注意事项

- `runMain` 对未匹配的子命令会直接报 `Unknown command` 退出——本项目因此采用 **bin 预路由**：`init`/`-h`/`--help` 交给 citty，其余（`--agent`、透传代理）在 `bin/cli.js` 前置分发到 `src/core/Commands.js` 能力层。
- 上游文档：<https://github.com/unjs/citty>，MIT License。
