/**
 * 地铁网络路径规划系统
 * 
 * 功能：
 * - 创建站点与线路
 * - 建立站点间的双向连接（支持环线、换乘）
 * - 插入、删除、弹出站点
 * - 带换乘惩罚的最短路径搜索（双向 BFS 算法在状态空间 (站点, 当前线路) 上运行）
 * - 可视化线路与路径信息，换乘处标注线路切换
 * 
 * 作者：Xieds
 * 版本：26.4(1)
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
    checkIsNone(start, "开始站");
    checkIsNone(target, "终点站");
    
    // 若路径不存在，输出不可达信息
    if (!path) {
        console.error(`    ${start.getStationName()} → ${target.getStationName()} : 无法到达`);
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
            const boundName = station.getBoundNameForLine(currLine)
            const prevBoundName = station.getBoundNameForLine(prevLine)
            displayNames.push(`[${boundName} ${prevLine?.getLineName()} - ${prevBoundName} ${currLine?.getLineName()}]`);
        } else {
            if (i > 0) cost++;
            const boundName = station.getBoundNameForLine(line)
            displayNames.push(boundName);
        }
    }
    
    // 输出最终结果
    // 获取起点和终点所在的线路（路径上实际使用的线路）
	const startLine = linePath[0];
	const endLine = linePath[linePath.length - 1];
	// 使用线路绑定名称
	const startBoundName = start.getBoundNameForLine(startLine);
	const endBoundName = target.getBoundNameForLine(endLine);
	console.log(`路径 (从 ${startBoundName} 到 ${endBoundName}，经过 ${path.length - 1} 个站点，其中换乘 ${transfers} 次)：
    ${displayNames.join(" → ")}`);
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
        this.#nameList.push(stationName);
        this.#lineToNameMap = new Map();
    }

    // 私有字段
    #stationName = undefined;       // 站点名称
    #isStartEnd = false;            // 是否为线路端点（用于某些特殊逻辑）
    #nextStations = [];             // 下一站列表（出站方向）
    #upStations = [];               // 上一站列表（进站方向）
    #connectWays = [];              // 所属线路列表
    #nameList = [];					// 防止有多个名字而准备的列表
    #lineToNameMap = new Map()		// key: RailWay 实例, value: 加入时的名称

    // 公开访问器
    getStationName() { return this.#stationName; }
    getNextStations() { return this.#nextStations; }
    getConnectWay() { return this.#connectWays; }
    getUpStations() { return this.#upStations; }
    getIsStartEnd() { return this.#isStartEnd; }
    getNameList() { return this.#nameList; }

    /**
     * 转换自身名字为另一个别称
     * @param {number} index 别称索引
     * @returns 是否转换成功
     */
    changeName(index) {
        if(index < 0 || index >= this.#nameList.length) { 
            console.log(`转换${this.#stationName}失败，原因：索引不存在`)
            return false 
        }

        console.log(`${this.#stationName} 已被转换为 ${this.#nameList[index]}`)
        this.#stationName = this.#nameList[index]
        return true
    }

    /**
     * 查找名称索引（如果不存在，则返回 -1）
     * @param {string} stationName 待查找名称
     * @returns 名称索引
     */
    findName(stationName) {
        if(stationName == undefined) return -1

        for(let i = 0; i < this.#nameList.length; i++) {
            if(this.#nameList[i] == stationName) return i
        }

        return -1
    }

    /**
     * 加入站点别称（默认更改为新添入的别称名）
     * @param {string} stationName 加入站点别称名
     * @returns 是否成功
     */
    pushName(stationName) {
        if(stationName == undefined) { 
            return false 
        }

        if(!this.#nameList.includes(stationName)) {
            this.#nameList.push(stationName)
        }
        console.log(`加入 ${stationName} 成功`)
        console.log(`${this.#stationName} 已被转换为别名 ${stationName}`)
        this.#stationName = stationName
        return true
    }

    /**
     * 弹出站点别称（默认更改为第一个名字）
     * @returns 是否成功
     */
    popName() {
        if(this.#nameList == null) { 
            console.error(`弹出失败，原因：别名表为空`)
            return false 
        }

        if(this.#nameList.length == 1) { 
            console.error(`弹出失败，原因：别名表不能为空`)
            return false 
        }

        console.log(`弹出 ${this.#nameList[length - 1]} 成功`)

        this.#nameList.pop()
        this.#stationName = this.#nameList[0]
        return true
    }

    /**
     * 依照索引删除别称（删除后默认更改为第一个名字）
     * @param {number} index 要删除的别称索引
     * @returns 是否成功
     */
    deleteName(index) {
        if(this.#nameList == null) { 
            console.error(`删除失败，原因：别名表不存在任何数值`)
            return false 
        }

        if(this.#nameList.length <= 1) { 
            console.error(`删除 ${this.#nameList[index]} 失败，原因：不能删除至别名表为空`)
            return false 
        }
        if(index < 0 || index >= this.#nameList.length) { 
            console.error(`删除失败，原因：索引不合法`)
            return false 
        }

        console.log(`别名 ${this.#nameList[index]} 已被删除 `)
        console.log(`${this.#stationName} 已被转换为 ${this.#nameList[0]}`)

        this.#nameList.splice(index,1)
        this.#stationName = this.#nameList[0]
        return true
    }

    recordLineBinding(line,boundName) {
        this.#lineToNameMap.set(line,boundName)
    }

    /**
     * 获取在一个路线上的绑定名称
     * @param {RailWay} line 路线实例
     * @returns 在这个路线上的绑定名称 | 本名
     */
    getBoundNameForLine(line) {
        return this.#lineToNameMap.get(line) || this.#stationName
    }

    /**
 	* （内部使用）确保某个名称存在于别名列表中，但不切换当前名称
 	* @param {string} name - 待确保的名称
 	*/
	_ensureNameInList(name) {
    	if (!name) return;
    	if (!this.#nameList.includes(name)) {
        	this.#nameList.push(name);
    	}

        this.#stationName = name
	}

    /**
     * 内部删除方法，仅供 RailWay 类使用
     */
    _cleanLineBinding(line) {
        this.#lineToNameMap.delete(line)
    }

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
     * 使用 双向BFS 在状态空间 (站点, 当前线路) 上搜索。
     * 代价规则：
     *   - 在同一线路内移动到相邻站点：代价 1
     *   - 在当前站点换乘到另一条线路：代价 1
     * 
     * @param {Station} targetStation - 目标站点
     * @returns {Station[] | null} 经过的站点序列（包含起止，连续重复站点表示换乘），并附有 linePath 属性；若不可达返回 null
     */
    goTo(targetStation) {
        if (this === targetStation) return [this];

        const startLines = this.getConnectWay();
        if (startLines.length === 0) return null;
        const targetLines = targetStation.getConnectWay();
        if (targetLines.length === 0) return null;

        // 状态键：站点实例 + 线路实例（对象引用可作为 Map 键，但这里仍使用字符串方便调试）
        const getStateKey = (station, line) => `${station.getStationName()}|${line.getLineName()}`;

        // 前向搜索：距离，父节点（{ station, line, key }）
        const distF = new Map();
        const parentF = new Map();   // 键 -> 父状态键
        const stateInfoF = new Map(); // 键 -> { station, line }
        const queueF = [];

        // 后向搜索
        const distB = new Map();
        const parentB = new Map();
        const stateInfoB = new Map();
        const queueB = [];

        // 初始化前向
        for (const line of startLines) {
            const key = getStateKey(this, line);
            distF.set(key, 0);
            parentF.set(key, null);
            stateInfoF.set(key, { station: this, line });
            queueF.push(key);
        }

        // 初始化后向
        for (const line of targetLines) {
            const key = getStateKey(targetStation, line);
            distB.set(key, 0);
            parentB.set(key, null);
            stateInfoB.set(key, { station: targetStation, line });
            queueB.push(key);
        }

        let meetKey = null;

        // 扩展函数：正向
        const expandF = () => {
            if (queueF.length === 0) return;
            const curKey = queueF.shift();
            const curDist = distF.get(curKey);
            const { station, line } = stateInfoF.get(curKey);

            // 相遇检测
            if (distB.has(curKey)) {
                meetKey = curKey;
                return true; // 立即停止
            }

            // 邻居：沿线路移动
            const neighbors = [...new Set([...station.getNextStations(), ...station.getUpStations()])];
            for (const neighbor of neighbors) {
                if (!neighbor.getConnectWay().includes(line)) continue;
                const nextKey = getStateKey(neighbor, line);
                if (!distF.has(nextKey)) {
                    distF.set(nextKey, curDist + 1);
                    parentF.set(nextKey, curKey);
                    stateInfoF.set(nextKey, { station: neighbor, line });
                    queueF.push(nextKey);
                }
            }

            // 换乘
            for (const otherLine of station.getConnectWay()) {
                if (otherLine === line) continue;
                const nextKey = getStateKey(station, otherLine);
                if (!distF.has(nextKey)) {
                    distF.set(nextKey, curDist + 1);
                    parentF.set(nextKey, curKey);
                    stateInfoF.set(nextKey, { station, line: otherLine });
                    queueF.push(nextKey);
                }
            }
            return false;
        };

        // 扩展函数：反向（逻辑相同）
        const expandB = () => {
            if (queueB.length === 0) return;
            const curKey = queueB.shift();
            const curDist = distB.get(curKey);
            const { station, line } = stateInfoB.get(curKey);

            if (distF.has(curKey)) {
                meetKey = curKey;
                return true;
            }

            const neighbors = [...new Set([...station.getNextStations(), ...station.getUpStations()])];
            for (const neighbor of neighbors) {
                if (!neighbor.getConnectWay().includes(line)) continue;
                const nextKey = getStateKey(neighbor, line);
                if (!distB.has(nextKey)) {
                    distB.set(nextKey, curDist + 1);
                    parentB.set(nextKey, curKey);
                    stateInfoB.set(nextKey, { station: neighbor, line });
                    queueB.push(nextKey);
                }
            }

            for (const otherLine of station.getConnectWay()) {
                if (otherLine === line) continue;
                const nextKey = getStateKey(station, otherLine);
                if (!distB.has(nextKey)) {
                    distB.set(nextKey, curDist + 1);
                    parentB.set(nextKey, curKey);
                    stateInfoB.set(nextKey, { station, line: otherLine });
                    queueB.push(nextKey);
                }
            }
            return false;
        };

        // 交替扩展
        while (queueF.length > 0 && queueB.length > 0 && meetKey === null) {
            if (queueF.length <= queueB.length) {
                if (expandF()) break;
            } else {
                if (expandB()) break;
            }
        }

        if (meetKey === null) return null;

        // 重构路径：从 meetKey 向前回溯到起点，向后回溯到终点
        const states = [];  // { station, line }

        // 前向部分：从 meetKey 回溯到起点（逆序）
        const fPath = [];
        let key = meetKey;
        while (key) {
            const info = stateInfoF.get(key);
            fPath.unshift({ station: info.station, line: info.line });
            key = parentF.get(key);
        }

        // 后向部分：从 meetKey 向后到终点（排除 meetKey 自身，以免重复）
        const bPath = [];
        key = parentB.get(meetKey);
        while (key) {
            const info = stateInfoB.get(key);
            bPath.push({ station: info.station, line: info.line });
            key = parentB.get(key);
        }

        // 合并：前向路径 + 后向路径
        states.push(...fPath, ...bPath);

        // 确保起点是 this，终点是 targetStation（可能因重名等问题略有偏差，修正一下）
        if (states.length === 0 || states[0].station !== this) {
            states.unshift({ station: this, line: startLines[0] });
        }
        if (states[states.length - 1].station !== targetStation) {
            states.push({ station: targetStation, line: targetLines[0] });
        }

        // 构建返回的站点路径和线路路径
        const stationPath = [];
        const linePath = [];
        for (const s of states) {
            stationPath.push(s.station);
            linePath.push(s.line);
        }

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
        station.recordLineBinding(this,station.getStationName())
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

        station._cleanLineBinding(this);

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
	* 快捷更改已绑定站点名
 	* @param {Station} pastStation - 要更改绑定名的站点实例
 	* @param {string} newStationName - 新的绑定名称
 	* @returns {boolean} 是否更改成功
 	*/
	changeStationName(pastStation, newStationName) {
    	if (!this.#railWayStations.includes(pastStation)) {
        	console.error(`站点 ${pastStation?.getStationName?.() || pastStation} 不在 ${this.#lineName} 线中`);
        	return false;
    	}

    	const oldBoundName = pastStation.getBoundNameForLine(this);
    	// 确保新名称存在于别名列表中，但不改变站点当前显示名
    	pastStation._ensureNameInList(newStationName);
    	// 更新线路绑定名
    	pastStation.recordLineBinding(this, newStationName);

    	console.log(`${oldBoundName} 在 ${this.#lineName} 线上的绑定名称已更改为 ${newStationName}`);
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
            const boundName = s.getBoundNameForLine(this)
            return `${boundName}-[${lines.join(', ')}]`;
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