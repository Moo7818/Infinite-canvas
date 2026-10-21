# 镜头、切镜与运镜

本模块说明多模态描述中镜头编号与切镜的写法，以及运镜的三个维度与示例。说话人、台词与画面文字见 `base-dialogue.md`，整体结构见 `base-structure.md`。

## 1. 镜头与切镜

后续镜头使用连续编号，并在开头写递增且位于视频时长范围内的切镜时间：

```text
[Shot 2] At 00:03.500, the camera cuts to...
```

普通切镜可使用 `the camera cuts to`、`the shot cuts to`、`the shot transitions to`、`the shot changes to` 或 `the shot switches to`，一些更加高级的切镜手法也可以灵活表述。

仅在用户明确要求时，也可使用交叉溶解、淡入淡出或擦除。一次切镜应引入关于主体、空间、状态、视角或时间的新信息；如果只是景别或微小角度的变化，优先使用运镜。

## 2. 镜头运动：运镜 + 幅度 + 速度

一个完整的镜头运动表达由三个维度组成：**运镜类型**决定相机如何运动，**幅度**说明构图变化范围，**速度**说明变化节奏（中等幅度和常速通常省略）。

|维度|可用表达|说明|
|---|---|---|
|运镜<br>|`Zoom In / Zoom Out`|焦距变化，相机机身不移动|
||`Push In / Pull Out`|相机向前 / 向后移动|
||`Pan Left / Pan Right`|相机位置不变，镜头水平转动|
||`Truck Left / Truck Right`|相机水平平移|
||`Tilt Up / Tilt Down`|相机位置不变，镜头垂直转动|
||`Pedestal Up / Pedestal Down`|相机整体升高 / 降低|
||`Arc Shot`|围绕主体弧形移动|
||`Tracking Shot`|跟随运动主体|
||`Static Shot`|机位和镜头均保持静止|
||`Shake Slightly / Shake Strongly`|轻微 / 强烈抖动|
||`POV`|主体主观视角|
||`Roll Clockwise / Roll Counterclockwise`|沿镜头轴顺时针 / 逆时针滚转|
|幅度|`with small amplitude`|小幅度变化|
||`with large amplitude`|大幅度变化|
|速度|`at slow speed`|慢速运动|
||`at fast speed`|快速运动|

运镜应作为自然英文动作写入镜头：

```text
The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.
The camera pans right with large amplitude at fast speed, revealing the open doorway.
The camera holds a static shot as the runner exits the frame.
```
