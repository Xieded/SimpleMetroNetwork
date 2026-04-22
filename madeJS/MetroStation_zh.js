/**
 * 地铁网络路径规划系统
 * 
 * 功能：
 * - 创建站点与线路
 * - 建立站点间的双向连接（支持环线、换乘）
 * - 插入、删除、弹出站点
 * - 带换乘惩罚的最短路径搜索（Dijkstra算法在状态空间 (站点, 当前线路) 上运行）
 * - 可视化线路与路径信息，换乘处标注线路切换
 * 
 * 作者：Xieds
 * 版本：1.0.0
 */

/**
 * 检测值是否为空
 * @param {*} value - 待检测的值
 * @param {string} [paramName='参数'] - 参数名称，用于错误提示
 * @returns {boolean} - 始终返回 true（若未抛出错误）
 * @throws {Error} 当值为 undefined 或 null 时抛出错误
 */
const checkIsNone = (value, paramName = '参数') => {
    // 若值为 undefined 或 null，则抛出错误
    if (value === undefined || value === null) {
        throw new Error(`${paramName} 不能为空`);
    }
    return true;
};

/**
 * 计算路径的实际代价（移动边数 + 换乘次数）
 * @param {Station[]} path - 站点序列（可能包含连续重复站点表示换乘）
 * @returns {number} 总代价（每一步无论移动还是换乘均计为 1）
 */
function calcPathCost(path) {
    // 无效或过短路径代价为 0
    if (!path || path.length < 2) return 0;
    let cost = 0;
    // 遍历路径中每一对相邻元素
    for (let i = 0; i < path.length - 1; i++) {
        // 每一步（移动或换乘）代价均为 1
        cost += 1;
    }
    return cost;
}

/**
 * 格式化打印路径及其代价、换乘次数，并在换乘处标注线路切换
 * @param {Station[]|null} path - 路径站点数组（由 goTo 方法返回，附有 linePath 属性）
 * @param {Station} start - 起始站点
 * @param {Station} target - 目标站点
 */
function printPathDetailed(path, start, target) {
    // 参数校验
    checkIsNone(path, "路线");
    checkIsNone(start, "开始站");
    checkIsNone(target, "终点站");
    
    // 若路径不存在，输出不可达信息
    if (!path) {
        console.log(`${start.getStationName()} → ${target.getStationName()} : 无法到达`);
        return;
    }
    
    // 获取伴随路径的线路信息（由 goTo 方法附加）
    const linePath = path.linePath || [];
    const displayNames = [];
    let cost = 0;
    let transfers = 0;
    
    // 遍历路径，构建显示字符串
    for (let i = 0; i < path.length; i++) {
        const station = path[i];
        const line = linePath[i];
        
        // 检测换乘：连续两个相同的站点对象表示在此处换乘
        if (i > 0 && path[i] === path[i-1]) {
            transfers++;
            cost++;
            const prevLine = linePath[i-1];
            const currLine = linePath[i];
            // 显示换乘信息，例如：[车公庙 1号线→11号线]
            displayNames.push(`[${station.getStationName()} ${prevLine?.getLineName()}→${currLine?.getLineName()}]`);
        } else {
            if (i > 0) cost++;
            displayNames.push(station.getStationName());
        }
    }
    
    // 输出最终结果
    console.log(`路径 (代价 ${cost}，其中换乘 ${transfers} 次)：${displayNames.join(" → ")}`);
}

/**
 * 最小堆（优先队列），用于 Dijkstra 算法中高效获取当前代价最小的状态
 */
class MinHeap {
    /**
     * @param {Function} [compare] - 比较函数，返回负数表示 a 在 b 前，默认升序
     */
    constructor(compare) {
        this.heap = [];
        this.compare = compare || ((a, b) => a - b);
    }

    /** 入堆 */
    push(value) {
        this.heap.push(value);
        this.#siftUp(this.heap.length - 1);
    }

    /** 弹出堆顶元素 */
    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this.#siftDown(0);
        }
        return top;
    }

    /** 堆是否为空 */
    isEmpty() {
        return this.heap.length === 0;
    }

    /** 上浮操作，维持堆性质 */
    #siftUp(index) {
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (this.compare(this.heap[index], this.heap[parent]) < 0) {
                [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
                index = parent;
            } else break;
        }
    }

    /** 下沉操作，维持堆性质 */
    #siftDown(index) {
        const n = this.heap.length;
        while (true) {
            let left = index * 2 + 1;
            let right = left + 1;
            let smallest = index;
            if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) smallest = left;
            if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) smallest = right;
            if (smallest !== index) {
                [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
                index = smallest;
            } else break;
        }
    }
}

/**
 * 站点类
 * 每个站点包含名称、上下行连接站点列表以及所属线路列表
 */
class Station {
    /**
     * 创建站点
     * @param {string} stationName - 站点名称
     */
    constructor(stationName) {
        checkIsNone(stationName, "站点名称");
        this.#stationName = stationName;
    }

    // 私有字段
    #stationName = undefined;       // 站点名称
    #isStartEnd = false;            // 是否为线路端点（用于某些特殊逻辑）
    #nextStations = [];             // 下一站列表（出站方向）
    #upStations = [];               // 上一站列表（进站方向）
    #connectWays = [];              // 所属线路列表

    // 公开访问器
    getStationName() { return this.#stationName; }
    getNextStations() { return this.#nextStations; }
    getConnectWay() { return this.#connectWays; }
    getUpStations() { return this.#upStations; }
    getIsStartEnd() { return this.#isStartEnd; }

    /** 切换端点标志 */
    rollIsStartEnd() {
        this.#isStartEnd = !this.#isStartEnd;
    }

    /**
     * 静态方法：建立两个站点之间的双向连接（stationF 的下一站包含 stationS，反之亦然）
     * @param {Station} stationF - 前一个站点
     * @param {Station} stationS - 后一个站点
     * @returns {boolean} 是否成功
     */
    static addConnectStation(stationF, stationS) {
        if (!stationF || !stationS) return false;
        stationF.#addStationNext(stationS);
        stationS.#addStationUp(stationF);
        return true;
    }

    /**
     * 实例方法：同时设置当前站点的下一站和上一站（用于特殊场景）
     * @param {Station} stationN - 下一站
     * @param {Station} staionU - 上一站
     */
    addOwnConnectStation(stationN, staionU) {
        this.#addStationNext(stationN);
        this.#addStationUp(staionU);
    }

    /**
     * 私有方法：添加下一站（单向）
     * @param {Station} station - 要添加的下一站
     * @returns {boolean} 是否成功
     */
    #addStationNext(station) {
        if (this.#nextStations.includes(station)) return false;
        if (station == undefined) return false;
        this.#nextStations.push(station);
        console.log(`已添加 ${station.getStationName()} 站作为 ${this.getStationName()} 的下一站`);
        return true;
    }

    /**
     * 私有方法：添加上一站（单向）
     * @param {Station} station - 要添加的上一站
     * @returns {boolean} 是否成功
     */
    #addStationUp(station) {
        if (this.#upStations.includes(station)) return false;
        if (station == undefined) return false;
        this.#upStations.push(station);
        console.log(`已添加 ${station.getStationName()} 站作为 ${this.getStationName()} 的上一站`);
        return true;
    }

    /**
     * 为站点添加所属线路（不建立站间连接）
     * @param {RailWay} line - 线路实例
     * @returns {boolean} 是否成功
     */
    addLine(line) {
        if (this.#connectWays.includes(line)) return false;
        this.#connectWays.push(line);
        return true;
    }

    /** 打印当前站点的所有下一站 */
    showNextStations() {
        console.log("=======" + this.#stationName + "的下一站点======");
        for (let s of this.getNextStations()) {
            console.log(s.getStationName());
        }
        console.log("==================================");
    }

    /** 打印当前站点的所有上一站 */
    showUpStations() {
        console.log("=======" + this.#stationName + "的上一站点======");
        for (let s of this.getUpStations()) {
            console.log(s.getStationName());
        }
        console.log("==================================");
    }

    /**
     * 带换乘惩罚的最短路径搜索（换乘算作多坐一站）
     * 使用 Dijkstra 算法在状态空间 (站点, 当前线路) 上搜索。
     * 代价规则：
     *   - 在同一线路内移动到相邻站点：代价 1
     *   - 在当前站点换乘到另一条线路：代价 1
     * 
     * @param {Station} targetStation - 目标站点
     * @returns {Station[] | null} 经过的站点序列（包含起止，连续重复站点表示换乘），并附有 linePath 属性；若不可达返回 null
     */
    goTo(targetStation) {
        // 起点即终点
        if (this === targetStation) return [this];

        // 获取起点和终点的所属线路
        const startLines = this.getConnectWay();
        if (startLines.length === 0) return null;
        const targetLines = targetStation.getConnectWay();
        if (targetLines.length === 0) return null;

        // 状态节点的唯一标识：站点名称 + 线路名称
        const getStateKey = (station, line) => `${station.getStationName()}|${line.getLineName()}`;

        // 距离映射表：stateKey -> 从起点到该状态的最小代价
        const dist = new Map();
        // 前驱映射表：stateKey -> { prevKey, station, line } 用于回溯路径
        const prev = new Map();

        // 优先队列（最小堆），元素格式 { cost, station, line }
        const heap = new MinHeap((a, b) => a.cost - b.cost);

        // 初始化：从起点的每条所属线路出发，代价为 0
        for (const line of startLines) {
            const stateKey = getStateKey(this, line);
            dist.set(stateKey, 0);
            prev.set(stateKey, null);
            heap.push({ cost: 0, station: this, line });
        }

        let bestTargetKey = null;      // 到达终点的最优状态 key
        let bestTargetCost = Infinity; // 到达终点的最小代价

        // Dijkstra 主循环
        while (!heap.isEmpty()) {
            const { cost, station, line } = heap.pop();
            const currentKey = getStateKey(station, line);

            // 如果当前代价已大于记录的最优值，跳过（懒惰删除）
            if (cost > (dist.get(currentKey) ?? Infinity)) continue;

            // 检查是否到达目标站点（任意线路）
            if (station === targetStation) {
                if (cost < bestTargetCost) {
                    bestTargetCost = cost;
                    bestTargetKey = currentKey;
                }
                // 继续寻找更优的到达方式（可能从其他线路进入目标站代价更低）
            }

            // 1. 同线路移动到相邻站点
            // 获取所有邻居（下一站 + 上一站），并用 Set 去重
            const neighbors = [...new Set([...station.getNextStations(), ...station.getUpStations()])];
            for (const neighbor of neighbors) {
                // 判断相邻站点是否也属于当前线路
                if (!neighbor.getConnectWay().includes(line)) continue;

                const newCost = cost + 1;
                const neighborKey = getStateKey(neighbor, line);
                if (newCost < (dist.get(neighborKey) ?? Infinity)) {
                    dist.set(neighborKey, newCost);
                    prev.set(neighborKey, { prevKey: currentKey, station: neighbor, line });
                    heap.push({ cost: newCost, station: neighbor, line });
                }
            }

            // 2. 换乘到本站的其他线路（代价 +1）
            for (const otherLine of station.getConnectWay()) {
                if (otherLine === line) continue; // 跳过当前线路

                const newCost = cost + 1;
                const transferKey = getStateKey(station, otherLine);
                if (newCost < (dist.get(transferKey) ?? Infinity)) {
                    dist.set(transferKey, newCost);
                    prev.set(transferKey, { prevKey: currentKey, station, line: otherLine });
                    heap.push({ cost: newCost, station, line: otherLine });
                }
            }
        }

        // 没有可达路径
        if (bestTargetKey === null) return null;

        // 回溯路径：从最佳终点状态反向追踪到起点，记录经过的状态（站点+线路）
        const stationPath = [];
        const linePath = [];
        let curKey = bestTargetKey;

        const states = []; // 临时存储状态顺序（从起点到终点）
        while (curKey) {
            const record = prev.get(curKey);
            if (!record) {
                // 到达起点状态（对应 this）
                states.unshift({ station: this, line: startLines[0] });
                break;
            }
            states.unshift({ station: record.station, line: record.line });
            curKey = record.prevKey;
        }

        // 确保起点在数组开头
        if (states.length === 0 || states[0].station !== this) {
            states.unshift({ station: this, line: startLines[0] });
        }
        // 确保终点在数组末尾
        if (states[states.length - 1].station !== targetStation) {
            states.push({ station: targetStation, line: targetLines[0] });
        }

        // 填充站点路径和对应线路路径
        for (const s of states) {
            stationPath.push(s.station);
            linePath.push(s.line);
        }

        // 将线路路径附加到站点数组上，供 printPathDetailed 使用
        stationPath.linePath = linePath;
        return stationPath;
    }
}

/**
 * 线路类
 * 表示一条地铁线路，包含线路名称、是否为环线以及站点顺序列表
 */
class RailWay {
    /**
     * 创建线路
     * @param {string} lineName - 线路名称
     * @param {boolean} [isLoop=false] - 是否为环线
     */
    constructor(lineName, isLoop = false) {
        checkIsNone(lineName, "线路名称");
        this.#lineName = lineName;
        this.#isLoop = isLoop;
    }

    // 私有字段
    #lineName = undefined;        // 线路名称
    #railWayStations = [];        // 线路上站点顺序列表
    #isLoop = false;              // 是否为环线

    // 公开访问器
    getRailWayStations() { return this.#railWayStations; }
    getLineName() { return this.#lineName; }
    getIsLoop() { return this.#isLoop; }
    setIsLoop(isLoop) { this.#isLoop = isLoop; }

    /**
     * 批量连接站点并加入线路
     * 按顺序建立相邻连接；若为环线，则额外闭合首尾。
     * @param  {...Station} stations - 按顺序排列的站点
     */
    connectStations(...stations) {
        // 过滤掉 undefined 和 null
        const validStations = stations.filter(s => s !== undefined && s !== null);
        if (validStations.length === 0) return;

        // 将所有站点加入线路（内部调用 pushStation，自动处理去重）
        validStations.forEach(s => this.pushStation(s));

        // 按顺序建立相邻连接
        for (let i = 0; i < validStations.length - 1; i++) {
            Station.addConnectStation(validStations[i], validStations[i + 1]);
        }

        // 如果是环线且站点数大于1，闭合首尾
        if (this.#isLoop && validStations.length > 1) {
            Station.addConnectStation(validStations[validStations.length - 1], validStations[0]);
        }
    }

    /**
     * 将站点加入线路列表（不建立站间连接）
     * @param {Station} station - 要加入的站点
     * @returns {boolean} 是否成功
     */
    pushStation(station) {
        if (!station) return false;
        if (this.#railWayStations.includes(station)) return false; // 已存在则忽略

        this.#railWayStations.push(station);
        station.addLine(this); // 双向关联：站点也记录所属线路
        console.log(`${station.getStationName()} 加入 ${this.#lineName} 线`);
        return true;
    }

    /**
     * 弹出线路末尾的站点（删除并返回）
     * @returns {Station|null} 被弹出的站点，若线路为空则返回 null
     */
    popStation() {
        if (this.#railWayStations.length === 0) {
            console.error(`${this.#lineName} 线中没有站点`);
            return null;
        }
        const lastStation = this.#railWayStations[this.#railWayStations.length - 1];
        this.deleteStation(lastStation); // 复用删除逻辑
        return lastStation;
    }

    /**
     * 从线路中删除指定站点
     * 会将其上一站与下一站直接相连（若存在），并清除该站与线路的关联。
     * @param {Station} station - 要删除的站点
     * @returns {boolean} 是否成功
     */
    deleteStation(station) {
        if (!station) return false;
        if (!this.#railWayStations.includes(station)) {
            console.error(`${station.getStationName()} 不在 ${this.#lineName} 线中`);
            return false;
        }

        // 找到同线路的上一站和下一站
        const prevOnLine = this.#getUpStationOnSameLine(station);
        const nextOnLine = this.#getNextStationOnSameLine(station);

        // 如果上一站和下一站均存在，则将其直接连接
        if (prevOnLine && nextOnLine) {
            Station.addConnectStation(prevOnLine, nextOnLine);
        }

        // 移除该站与相邻站点的连接
        if (prevOnLine) {
            this.#removeConnection(prevOnLine, station);
        }
        if (nextOnLine) {
            this.#removeConnection(station, nextOnLine);
        }

        // 从线路站点列表中移除
        const index = this.#railWayStations.indexOf(station);
        this.#railWayStations.splice(index, 1);

        // 从站点的线路列表中移除此线路
        const lineIndex = station.getConnectWay().indexOf(this);
        if (lineIndex !== -1) {
            station.getConnectWay().splice(lineIndex, 1);
        }

        console.log(`${station.getStationName()} 已从 ${this.#lineName} 线中删除`);
        return true;
    }

    /**
     * 在指定站点与其同线路下一站之间插入新站
     * @param {Station} fromStation - 线路中已存在的站点
     * @param {Station} insertStation - 要插入的新站
     * @returns {boolean} 是否成功
     */
    insertStation(fromStation, insertStation) {
        if (!this.#railWayStations.includes(fromStation)) {
            console.error(`无法在 ${this.#lineName} 中找到 ${fromStation.getStationName()} 站`);
            return false;
        }
        if (!insertStation) {
            console.error(`插入站不能为空`);
            return false;
        }

        // 找到 fromStation 在本线路中的下一站
        const nextOnLine = this.#getNextStationOnSameLine(fromStation);
        if (!nextOnLine) {
            console.error(`${fromStation.getStationName()} 没有同线路的下一站，无法插入`);
            return false;
        }

        // 断开原有连接
        this.#removeConnection(fromStation, nextOnLine);

        // 建立新连接：fromStation → insertStation → nextOnLine
        Station.addConnectStation(fromStation, insertStation);
        Station.addConnectStation(insertStation, nextOnLine);

        // 将新站插入到线路列表中（紧跟在 fromStation 之后）
        const fromIndex = this.#railWayStations.indexOf(fromStation);
        this.#railWayStations.splice(fromIndex + 1, 0, insertStation);
        insertStation.addLine(this);

        console.log(`已在 ${fromStation.getStationName()} 和 ${nextOnLine.getStationName()} 之间插入 ${insertStation.getStationName()}`);
        return true;
    }

    /**
     * 私有方法：获取站点在本线路中的下一站（同线路）
     * @param {Station} station - 当前站点
     * @returns {Station|undefined} 同线路下一站，若无则返回 undefined
     */
    #getNextStationOnSameLine(station) {
        const nextStations = station.getNextStations();
        return nextStations.find(ns => ns.getConnectWay().includes(this));
    }

    /**
     * 私有方法：获取站点在本线路中的上一站（同线路）
     * @param {Station} station - 当前站点
     * @returns {Station|undefined} 同线路上一站，若无则返回 undefined
     */
    #getUpStationOnSameLine(station) {
        const upStations = station.getUpStations();
        return upStations.find(us => us.getConnectWay().includes(this));
    }

    /**
     * 私有方法：移除两个站点之间的双向连接（若存在）
     * @param {Station} stationA - 站点 A
     * @param {Station} stationB - 站点 B
     */
    #removeConnection(stationA, stationB) {
        // 移除 A 的下一站中的 B
        const aNext = stationA.getNextStations();
        const aNextIndex = aNext.indexOf(stationB);
        if (aNextIndex !== -1) aNext.splice(aNextIndex, 1);

        // 移除 B 的上一站中的 A
        const bUp = stationB.getUpStations();
        const bUpIndex = bUp.indexOf(stationA);
        if (bUpIndex !== -1) bUp.splice(bUpIndex, 1);

        // 同时检查反向连接，以防数据不对称（例如 B 的下一站包含 A）
        const bNext = stationB.getNextStations();
        const bNextIndex = bNext.indexOf(stationA);
        if (bNextIndex !== -1) bNext.splice(bNextIndex, 1);

        const aUp = stationA.getUpStations();
        const aUpIndex = aUp.indexOf(stationB);
        if (aUpIndex !== -1) aUp.splice(aUpIndex, 1);
    }

    /**
     * 打印线路信息，包括站点顺序及各站所属线路
     */
    showRailWayStations() {
        console.log(`===== ${this.#lineName} ${this.#isLoop ? '(环线)' : ''} =====`);
        const stationList = this.#railWayStations.map(s => {
            const lines = s.getConnectWay().map(l => l.getLineName());
            return `${s.getStationName()}-[${lines.join(', ')}]`;
        });
        console.log(`${stationList.join(' → ')}, 共 ${stationList.length} 个站`);
        console.log("===============");
    }
}

// ==================== 模块导出 ====================
// 同时支持 ES6 模块 (export) 和 CommonJS (module.exports)

// 1. 使用 ES6 export 导出所有公开成员
export { Station, RailWay, MinHeap, checkIsNone, calcPathCost, printPathDetailed };

// 2. 如果是 CommonJS 环境（Node.js 非 module 模式），额外挂载到 module.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Station, RailWay, MinHeap, checkIsNone, calcPathCost, printPathDetailed };
}