package fileVarious;

import java.util.*;

public class Station {
    private String stationName; // 当前显示名称
    private boolean isStartEnd = false;
    private final List<Station> nextStations = new ArrayList<>();
    private final List<Station> upStations = new ArrayList<>();
    private final List<RailWay> connectWays = new ArrayList<>();
    private final List<String> nameList = new ArrayList<>();        // 所有别名
    private final Map<RailWay, String> lineToNameMap = new HashMap<>(); // 线路->绑定名

    public Station(String stationName) {
        if (stationName == null) throw new IllegalArgumentException("站点名称不能为空");
        this.stationName = stationName;
        this.nameList.add(stationName);
    }

    // ---------- 基本访问器 ----------
    public String getStationName() { return stationName; }
    public List<Station> getNextStations() { return nextStations; }
    public List<RailWay> getConnectWay() { return connectWays; }
    public List<Station> getUpStations() { return upStations; }
    public boolean getIsStartEnd() { return isStartEnd; }
    public List<String> getNameList() { return Collections.unmodifiableList(nameList); }

    public void rollIsStartEnd() { isStartEnd = !isStartEnd; }

    // ---------- 别名管理 ----------
    /** 切换当前显示名称到指定别名索引 */
    public boolean changeName(int index) {
        if (index < 0 || index >= nameList.size()) {
            System.out.println("转换" + stationName + "失败，原因：索引不存在");
            return false;
        }
        System.out.println(stationName + " 已被转换为 " + nameList.get(index));
        stationName = nameList.get(index);
        return true;
    }

    /** 查找别名索引，不存在返回 -1 */
    public int findName(String name) {
        if (name == null) return -1;
        for (int i = 0; i < nameList.size(); i++) {
            if (nameList.get(i).equals(name)) return i;
        }
        return -1;
    }

    /** 添加别名（并自动切换为当前名） */
    public boolean pushName(String name) {
        if (name == null) return false;
        if (!nameList.contains(name)) {
            nameList.add(name);
        }
        System.out.println("加入 " + name + " 成功");
        System.out.println(stationName + " 已被转换为别名 " + name);
        stationName = name;
        return true;
    }

    /** 弹出最后一个别名（至少保留一个），并切换到第一个别名 */
    public boolean popName() {
        if (nameList.size() <= 1) {
            System.err.println("弹出失败，原因：别名表不能为空或仅有一个");
            return false;
        }
        String removed = nameList.remove(nameList.size() - 1);
        System.out.println("弹出 " + removed + " 成功");
        stationName = nameList.get(0);
        return true;
    }

    /** 按索引删除别名，切换到第一个别名 */
    public boolean deleteName(int index) {
        if (nameList.size() <= 1) {
            System.err.println("删除失败，原因：不能删除至别名表为空");
            return false;
        }
        if (index < 0 || index >= nameList.size()) {
            System.err.println("删除失败，原因：索引不合法");
            return false;
        }
        String removed = nameList.remove(index);
        System.out.println("别名 " + removed + " 已被删除");
        System.out.println(stationName + " 已被转换为 " + nameList.get(0));
        stationName = nameList.get(0);
        return true;
    }

    // ---------- 线路绑定名称 ----------
    /** 记录站点在某线路上的绑定名称 */
    public void recordLineBinding(RailWay line, String boundName) {
        lineToNameMap.put(line, boundName);
    }

    /** 获取站点在某线路上的显示名称（若无绑定则返回当前名） */
    public String getBoundNameForLine(RailWay line) {
        return lineToNameMap.getOrDefault(line, stationName);
    }

    /** 内部使用：确保某名称在别名列表中，但不切换当前名 */
    public void _ensureNameInList(String name) {
        if (name == null) return;
        if (!nameList.contains(name)) {
            nameList.add(name);
        }
        // JS 版中还设置了 this.#stationName = name，这里保持一致（注意：JS 原始代码 _ensureNameInList 里有 this.#stationName = name）
        stationName = name;
    }

    /** 内部使用：清除线路绑定（供 RailWay 删除站点时调用） */
    public void _cleanLineBinding(RailWay line) {
        lineToNameMap.remove(line);
    }

    // ---------- 连接管理 ----------
    public static boolean addConnectStation(Station stationF, Station stationS) {
        if (stationF == null || stationS == null) return false;
        stationF.addStationNext(stationS);
        stationS.addStationUp(stationF);
        return true;
    }

    public void addOwnConnectStation(Station stationN, Station stationU) {
        addStationNext(stationN);
        addStationUp(stationU);
    }

    private boolean addStationNext(Station station) {
        if (nextStations.contains(station) || station == null) return false;
        nextStations.add(station);
        System.out.println("已添加 " + station.getStationName() + " 站作为 " + this.getStationName() + " 的下一站");
        return true;
    }

    private boolean addStationUp(Station station) {
        if (upStations.contains(station) || station == null) return false;
        upStations.add(station);
        System.out.println("已添加 " + station.getStationName() + " 站作为 " + this.getStationName() + " 的上一站");
        return true;
    }

    public boolean addLine(RailWay line) {
        if (connectWays.contains(line)) return false;
        connectWays.add(line);
        return true;
    }

    public void showNextStations() {
        System.out.println("=======" + stationName + "的下一站点======");
        for (Station s : nextStations) System.out.println(s.getStationName());
        System.out.println("==================================");
    }

    public void showUpStations() {
        System.out.println("=======" + stationName + "的上一站点======");
        for (Station s : upStations) System.out.println(s.getStationName());
        System.out.println("==================================");
    }

    // ---------- 路径搜索结果封装 ----------
    public static class GoToResult {
        private final List<Station> stations;
        private final List<RailWay> lines;
        public GoToResult(List<Station> stations, List<RailWay> lines) {
            this.stations = stations;
            this.lines = lines;
        }
        public List<Station> getStations() { return stations; }
        public List<RailWay> getLines() { return lines; }
    }

    // ---------- 双向 BFS 内部数据结构 ----------
    private static class StateKey {
        final Station station;
        final RailWay line;
        StateKey(Station s, RailWay l) {
            this.station = s;
            this.line = l;
        }
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof StateKey)) return false;
            StateKey that = (StateKey) o;
            return station == that.station && line == that.line; // 引用相等即可
        }
        @Override
        public int hashCode() {
            return Objects.hash(station, line);
        }
    }

    private static class StateRecord {
        final Station station;
        final RailWay line;
        StateRecord(Station station, RailWay line) {
            this.station = station;
            this.line = line;
        }
    }

    /**
     * 双向 BFS 最短路径搜索（换乘代价为 1）
     */
    public GoToResult goTo(Station targetStation) {
        if (this == targetStation) {
            List<Station> single = new ArrayList<>(); single.add(this);
            return new GoToResult(single, new ArrayList<>());
        }

        List<RailWay> startLines = this.getConnectWay();
        if (startLines.isEmpty()) return null;
        List<RailWay> targetLines = targetStation.getConnectWay();
        if (targetLines.isEmpty()) return null;

        // 正向搜索
        Map<StateKey, Integer> distF = new HashMap<>();
        Map<StateKey, StateKey> parentF = new HashMap<>();
        Map<StateKey, StateRecord> infoF = new HashMap<>();
        Queue<StateKey> queueF = new LinkedList<>();

        // 反向搜索
        Map<StateKey, Integer> distB = new HashMap<>();
        Map<StateKey, StateKey> parentB = new HashMap<>();
        Map<StateKey, StateRecord> infoB = new HashMap<>();
        Queue<StateKey> queueB = new LinkedList<>();

        // 初始化正向
        for (RailWay line : startLines) {
            StateKey key = new StateKey(this, line);
            distF.put(key, 0);
            parentF.put(key, null);
            infoF.put(key, new StateRecord(this, line));
            queueF.add(key);
        }
        // 初始化反向
        for (RailWay line : targetLines) {
            StateKey key = new StateKey(targetStation, line);
            distB.put(key, 0);
            parentB.put(key, null);
            infoB.put(key, new StateRecord(targetStation, line));
            queueB.add(key);
        }

        StateKey meetKey = null;

        while (!queueF.isEmpty() && !queueB.isEmpty() && meetKey == null) {
            if (queueF.size() <= queueB.size()) {
                meetKey = expand(queueF, distF, parentF, infoF, distB, true);
            } else {
                meetKey = expand(queueB, distB, parentB, infoB, distF, false);
            }
        }

        if (meetKey == null) return null;

        // 重构路径
        LinkedList<StateRecord> stateList = new LinkedList<>();

        // 正向回溯（从 meetKey 到起点）
        StateKey cur = meetKey;
        while (cur != null && infoF.containsKey(cur)) {
            StateRecord rec = infoF.get(cur);
            stateList.addFirst(rec);
            cur = parentF.get(cur);
        }
        // 反向回溯（从 meetKey 在反向的父亲开始，到终点）
        cur = parentB.get(meetKey);
        while (cur != null && infoB.containsKey(cur)) {
            StateRecord rec = infoB.get(cur);
            stateList.addLast(rec);
            cur = parentB.get(cur);
        }

        // 确保首尾正确
        if (stateList.isEmpty() || stateList.getFirst().station != this) {
            stateList.addFirst(new StateRecord(this, startLines.get(0)));
        }
        if (stateList.getLast().station != targetStation) {
            stateList.addLast(new StateRecord(targetStation, targetLines.get(0)));
        }

        List<Station> stationPath = new ArrayList<>();
        List<RailWay> linePath = new ArrayList<>();
        for (StateRecord sr : stateList) {
            stationPath.add(sr.station);
            linePath.add(sr.line);
        }

        return new GoToResult(stationPath, linePath);
    }

    // 扩展队列的公共逻辑
    private static StateKey expand(Queue<StateKey> queue,
                                   Map<StateKey, Integer> dist,
                                   Map<StateKey, StateKey> parent,
                                   Map<StateKey, StateRecord> info,
                                   Map<StateKey, Integer> otherDist,
                                   boolean isForward) {
        if (queue.isEmpty()) return null;
        StateKey curKey = queue.poll();
        int curDist = dist.get(curKey);
        StateRecord curRec = info.get(curKey);
        Station station = curRec.station;
        RailWay line = curRec.line;

        // 相遇检测
        if (otherDist.containsKey(curKey)) {
            return curKey;
        }

        // 同线路移动
        Set<Station> neighbors = new HashSet<>();
        neighbors.addAll(station.getNextStations());
        neighbors.addAll(station.getUpStations());
        for (Station neighbor : neighbors) {
            if (!neighbor.getConnectWay().contains(line)) continue;
            StateKey nextKey = new StateKey(neighbor, line);
            if (!dist.containsKey(nextKey)) {
                dist.put(nextKey, curDist + 1);
                parent.put(nextKey, curKey);
                info.put(nextKey, new StateRecord(neighbor, line));
                queue.add(nextKey);
            }
        }

        // 换乘
        for (RailWay otherLine : station.getConnectWay()) {
            if (otherLine == line) continue;
            StateKey nextKey = new StateKey(station, otherLine);
            if (!dist.containsKey(nextKey)) {
                dist.put(nextKey, curDist + 1);
                parent.put(nextKey, curKey);
                info.put(nextKey, new StateRecord(station, otherLine));
                queue.add(nextKey);
            }
        }
        return null;
    }
}