package fileVarious;

import java.util.*;

public class MetroUtils {
    public static boolean checkIsNone(Object value, String paramName) {
        if (value == null) throw new IllegalArgumentException(paramName + " 不能为空");
        return true;
    }

    public static int calcPathCost(List<Station> path) {
        if (path == null || path.size() < 2) return 0;
        return path.size() - 1;
    }

    public static void printPathDetailed(Station.GoToResult result, Station start, Station target) {
        if (result == null) {
            System.err.println("    " + start.getStationName() + " → " + target.getStationName() + " : 无法到达");
            return;
        }

        List<Station> path = result.getStations();
        List<RailWay> lines = result.getLines();
        if (path == null || path.isEmpty()) {
            System.err.println("    " + start.getStationName() + " → " + target.getStationName() + " : 无法到达");
            return;
        }

        List<String> displayNames = new ArrayList<>();
        int cost = 0;
        int transfers = 0;

        for (int i = 0; i < path.size(); i++) {
            Station station = path.get(i);
            RailWay line = lines.get(i);

            if (i > 0 && path.get(i) == path.get(i - 1)) {
                transfers++;
                cost++;
                RailWay prevLine = lines.get(i - 1);
                RailWay currLine = lines.get(i);
                String boundName = station.getBoundNameForLine(currLine);
                String prevBoundName = station.getBoundNameForLine(prevLine);
                displayNames.add("[" + boundName + " " + prevLine.getLineName() + " - " + prevBoundName + " " + currLine.getLineName() + "]");
            } else {
                if (i > 0) cost++;
                String boundName = station.getBoundNameForLine(line);
                displayNames.add(boundName);
            }
        }

        RailWay startLine = lines.get(0);
        RailWay endLine = lines.get(lines.size() - 1);
        String startBoundName = start.getBoundNameForLine(startLine);
        String endBoundName = target.getBoundNameForLine(endLine);

        System.out.println("路径 (从 " + startBoundName + " 到 " + endBoundName + "，经过 " + (path.size() - 1) + " 个站点，其中换乘 " + transfers + " 次)：");
        System.out.println("    " + String.join(" → ", displayNames));
    }
}