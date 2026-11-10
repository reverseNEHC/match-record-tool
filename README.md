# Match Record Tool

Match Record Tool 是一个纯前端的比赛记录工具，用于现场记录篮球、足球和自定义运动比赛的比分、统计数据与事件时间线。应用无需安装或构建，可在现代浏览器中运行。

## 功能

- 管理队伍、球员、球衣号码、位置和队伍颜色。
- 创建篮球、足球或自定义运动比赛，并设置比赛时长、节次和加时规则。
- 记录实时比分、计时、节次、比赛事件及撤销得分。
- 记录篮球球员统计、足球球队数据和自定义数据项。
- 查看比赛统计与事件时间线。
- 将单场比赛导出为 JSON 或 Excel；导入 JSON 备份。

## 快速开始

1. 下载或克隆本项目。
2. 在浏览器中打开项目根目录的 `index.html`。
3. 进入“队伍”创建至少两支队伍，并按需要添加球员。
4. 回到“比赛”，创建比赛并开始记录。

也可以从“导入”按钮选择 `data/sample.json`，载入示例比赛和队伍。

## 数据与隐私

- 比赛和队伍数据保存在当前浏览器的 LocalStorage 中，不会由本应用上传到服务器。
- 浏览器数据被清除后，本地记录可能无法恢复。请使用 JSON 导出功能定期备份。
- 更换浏览器或设备时，可先导出 JSON，再在另一处导入。
- Excel 导出使用 SheetJS CDN，需要网络连接；本地记录和 JSON 导入导出不依赖该 CDN。

## 技术说明

- 原生 HTML、CSS 和 JavaScript，无需 npm、构建工具或后端服务。
- 使用 Hash 路由切换页面。
- GitHub Pages 可直接发布本项目根目录，入口文件为 `index.html`。

## 项目结构

```text
match-record-tool/
├── index.html              # 页面入口
├── css/
│   ├── style.css           # 全局样式与主题
│   └── components.css      # 页面和组件样式
├── js/
│   ├── app.js              # 应用初始化
│   ├── constants.js        # 运动类型与规则配置
│   ├── models.js           # 比赛、队伍和统计数据模型
│   ├── store.js            # LocalStorage 与 JSON 导入导出
│   ├── router.js           # Hash 路由
│   ├── excel.js            # Excel 导出
│   ├── components/         # 导航栏、计分板、计时器等组件
│   └── pages/              # 比赛、队伍和统计页面
├── data/
│   └── sample.json         # 可手动导入的示例数据
└── read me.txt             # 详细中文使用说明
```

