import fileVarious.*;

public class test {
    public static void main(String[] args) {
        // 创建站点
        Station a = new Station("A");
        Station b = new Station("B");
        Station c = new Station("C");
        Station d = new Station("D");

        // 创建线路
        RailWay line1 = new RailWay("1号线", false);
        line1.connectStations(a, b, c);

        RailWay line2 = new RailWay("2号线", false);
        line2.connectStations(b, d);

        // 测试路径搜索
        Station.GoToResult result = a.goTo(d);
        MetroUtils.printPathDetailed(result, a, d);

        // 测试别名与绑定名称
        a.pushName("A'");               // 当前名变为 A'
        line1.changeStationName(b, "B1");   // 将 B 在1号线上的绑定名改为 B1
        line2.changeStationName(b, "B2");   // B 在2号线上叫 B2

        System.out.println("\n修改绑定后：");
        result = a.goTo(d);
        MetroUtils.printPathDetailed(result, a, d);
    }
}