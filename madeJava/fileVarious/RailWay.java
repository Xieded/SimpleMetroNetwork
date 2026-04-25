package fileVarious;

import java.util.*;

public class RailWay {
    private final String lineName;
    private final List<Station> railWayStations = new ArrayList<>();
    private boolean isLoop;

    public RailWay(String lineName, boolean isLoop) {
        if (lineName == null) throw new IllegalArgumentException("线路名称不能为空");
        this.lineName = lineName;
        this.isLoop = isLoop;
    }

    public List<Station> getRailWayStations() { return railWayStations; }
    public String getLineName() { return lineName; }
    public boolean getIsLoop() { return isLoop; }
    public void setIsLoop(boolean isLoop) { this.isLoop = isLoop; }

    public void connectStations(Station... stations) {
        List<Station> valid = new ArrayList<>();
        for (Station s : stations) if (s != null) valid.add(s);
        if (valid.isEmpty()) return;

        for (Station s : valid) pushStation(s);

        for (int i = 0; i < valid.size() - 1; i++)
            Station.addConnectStation(valid.get(i), valid.get(i + 1));

        if (isLoop && valid.size() > 1)
            Station.addConnectStation(valid.get(valid.size() - 1), valid.get(0));
    }

    public boolean pushStation(Station station) {
        if (station == null) return false;
        if (railWayStations.contains(station)) return false;

        railWayStations.add(station);
        station.addLine(this);
        station.recordLineBinding(this, station.getStationName()); // 初始绑定为当前名
        System.out.println(station.getStationName() + " 加入 " + lineName + " 线");
        return true;
    }

    public Station popStation() {
        if (railWayStations.isEmpty()) {
            System.err.println(lineName + " 线中没有站点");
            return null;
        }
        Station last = railWayStations.get(railWayStations.size() - 1);
        deleteStation(last);
        return last;
    }

    public boolean deleteStation(Station station) {
        if (station == null) return false;
        if (!railWayStations.contains(station)) {
            System.err.println(station.getStationName() + " 不在 " + lineName + " 线中");
            return false;
        }

        Station prev = getUpStationOnSameLine(station);
        Station next = getNextStationOnSameLine(station);

        if (prev != null && next != null) Station.addConnectStation(prev, next);
        if (prev != null) removeConnection(prev, station);
        if (next != null) removeConnection(station, next);

        railWayStations.remove(station);
        station.getConnectWay().remove(this);
        station._cleanLineBinding(this);

        System.out.println(station.getStationName() + " 已从 " + lineName + " 线中删除");
        return true;
    }

    public boolean insertStation(Station from, Station insert) {
        if (!railWayStations.contains(from)) {
            System.err.println("无法在 " + lineName + " 中找到 " + from.getStationName() + " 站");
            return false;
        }
        if (insert == null) {
            System.err.println("插入站不能为空");
            return false;
        }
        Station next = getNextStationOnSameLine(from);
        if (next == null) {
            System.err.println(from.getStationName() + " 没有同线路的下一站，无法插入");
            return false;
        }

        removeConnection(from, next);
        Station.addConnectStation(from, insert);
        Station.addConnectStation(insert, next);

        int idx = railWayStations.indexOf(from);
        railWayStations.add(idx + 1, insert);
        insert.addLine(this);
        System.out.println("已在 " + from.getStationName() + " 和 " + next.getStationName() + " 之间插入 " + insert.getStationName());
        return true;
    }

    /** 快捷更改已绑定站点名 */
    public boolean changeStationName(Station pastStation, String newStationName) {
        if (!railWayStations.contains(pastStation)) {
            System.err.println("站点 " + (pastStation != null ? pastStation.getStationName() : "null") + " 不在 " + lineName + " 线中");
            return false;
        }
        String oldBoundName = pastStation.getBoundNameForLine(this);
        pastStation._ensureNameInList(newStationName);
        pastStation.recordLineBinding(this, newStationName);
        System.out.println(oldBoundName + " 在 " + lineName + " 线上的绑定名称已更改为 " + newStationName);
        return true;
    }

    private Station getNextStationOnSameLine(Station station) {
        for (Station ns : station.getNextStations())
            if (ns.getConnectWay().contains(this)) return ns;
        return null;
    }

    private Station getUpStationOnSameLine(Station station) {
        for (Station us : station.getUpStations())
            if (us.getConnectWay().contains(this)) return us;
        return null;
    }

    private void removeConnection(Station a, Station b) {
        a.getNextStations().remove(b);
        b.getUpStations().remove(a);
        b.getNextStations().remove(a);
        a.getUpStations().remove(b);
    }

    public void showRailWayStations() {
        System.out.println("===== " + lineName + (isLoop ? " (环线)" : "") + " =====");
        List<String> parts = new ArrayList<>();
        for (Station s : railWayStations) {
            List<String> lineNames = new ArrayList<>();
            for (RailWay l : s.getConnectWay()) lineNames.add(l.getLineName());
            String boundName = s.getBoundNameForLine(this);
            parts.add(boundName + "-[" + String.join(", ", lineNames) + "]");
        }
        System.out.println(String.join(" → ", parts) + ", 共 " + parts.size() + " 个站");
        System.out.println("===============");
    }
}