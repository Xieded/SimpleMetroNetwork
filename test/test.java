import fileVarious.*;
import java.util.*;

/**
 * 地铁网络路径规划系统 - 完整测试套件
 * 覆盖基本功能、换乘、环线、别名、增删改、边界异常等场景
 */
public class test {
    static int passed = 0;
    static int failed = 0;

    public static void main(String[] args) {
        System.out.println("===== 地铁网络系统测试开始 =====");

        testBasicPath();
        testTransferPath();
        testLoopLine();
        testStartEqualsTarget();
        testUnreachable();
        testDeleteStation();
        testInsertStation();
        testAliasAndBinding();
        testComplexNetwork();
        testMultiplePaths();
        testNullChecks();
        testPrintFunctions();

        System.out.println("\n=================================");
        System.out.println("测试结果: 通过 " + passed + " 个, 失败 " + failed + " 个");
        if (failed > 0) {
            System.exit(1); // 失败退出码
        }
    }

    // 断言工具
    static void check(boolean condition, String message) {
        if (condition) {
            passed++;
            System.out.println("  ✅ " + message);
        } else {
            failed++;
            System.out.println("  ❌ " + message + "  --- 失败！");
        }
    }

    // 1. 基础路径：单线直达
    static void testBasicPath() {
        System.out.println("\n[测试] 基础单线路径");
        Station a = new Station("A");
        Station b = new Station("B");
        Station c = new Station("C");
        RailWay line = new RailWay("1号线", false);
        line.connectStations(a, b, c);

        Station.GoToResult r = a.goTo(c);
        check(r != null, "非空路径");
        check(r.getStations().size() == 3, "路径站点数应为3");
        check(r.getStations().get(0) == a && r.getStations().get(2) == c, "起点终点正确");
    }

    // 2. 换乘路径（1次换乘）
    static void testTransferPath() {
        System.out.println("\n[测试] 换乘路径");
        Station a = new Station("A");
        Station b = new Station("B");
        Station c = new Station("C");
        Station d = new Station("D");

        RailWay line1 = new RailWay("1号线", false);
        line1.connectStations(a, b, c);
        RailWay line2 = new RailWay("2号线", false);
        line2.connectStations(b, d);

        Station.GoToResult r = a.goTo(d);
        check(r != null, "存在路径");
        if (r != null) {
            // 路径应包含换乘：A -> B -> [B 1→2] -> D (连续B出现)
            List<Station> path = r.getStations();
            check(path.contains(b), "路径包含换乘站B");
            // 检查换乘标记（相同站点连续出现两次）
            boolean hasTransfer = false;
            for (int i = 1; i < path.size(); i++) {
                if (path.get(i) == path.get(i-1)) {
                    hasTransfer = true;
                    break;
                }
            }
            check(hasTransfer, "路径中有换乘标记");
        }
    }

    // 3. 环线路径
    static void testLoopLine() {
        System.out.println("\n[测试] 环线路径");
        Station a = new Station("A");
        Station b = new Station("B");
        Station c = new Station("C");
        Station d = new Station("D");

        RailWay loop = new RailWay("环线", true);
        loop.connectStations(a, b, c, d);

        // 环线中从任意点到对角线点，应存在路径
        Station.GoToResult r = a.goTo(c);
        check(r != null, "环线可达");
        check(r.getStations().size() > 1, "环线路径不为空");
    }

    // 4. 起点等于终点
    static void testStartEqualsTarget() {
        System.out.println("\n[测试] 起点等于终点");
        Station a = new Station("A");
        Station.GoToResult r = a.goTo(a);
        check(r != null, "返回非空");
        if (r != null) {
            check(r.getStations().size() == 1, "路径只包含自身");
        }
    }

    // 5. 不可达情况
    static void testUnreachable() {
        System.out.println("\n[测试] 不可达站点");
        Station a = new Station("A");
        Station b = new Station("B");
        Station c = new Station("C");
        // 仅连接A-B，C孤立
        RailWay line = new RailWay("1号线", false);
        line.connectStations(a, b);

        Station.GoToResult r = a.goTo(c);
        check(r == null, "孤立站点返回null");
    }

    // 6. 删除站点后路径更新
    static void testDeleteStation() {
        System.out.println("\n[测试] 删除站点后路径");
        Station a = new Station("A");
        Station b = new Station("B");
        Station c = new Station("C");
        Station d = new Station("D");
        RailWay line = new RailWay("1号线", false);
        line.connectStations(a, b, c, d);

        // 删除中间站B
        line.deleteStation(b);
        Station.GoToResult r = a.goTo(d);
        check(r != null, "删除后仍可达");
        if (r != null) {
            // 路径不应再经过B
            boolean noB = true;
            for (Station s : r.getStations()) {
                if (s == b) { noB = false; break; }
            }
            check(noB, "路径不包含被删除的站点");
        }
    }

    // 7. 插入站点
    static void testInsertStation() {
        System.out.println("\n[测试] 插入站点");
        Station a = new Station("A");
        Station c = new Station("C");
        Station x = new Station("X");
        RailWay line = new RailWay("1号线", false);
        line.connectStations(a, c);       // 只有A和C

        line.insertStation(a, x);         // 在A后插入X -> A-X-C
        Station.GoToResult r = a.goTo(c);
        check(r != null, "插入后可达");
        if (r != null) {
            List<Station> path = r.getStations();
            check(path.size() >= 2, "路径至少包含2站");
            // 检查X在路径中
            check(path.contains(x), "路径包含新插入的站点");
        }
    }

    // 8. 别名与线路绑定名称
    static void testAliasAndBinding() {
        System.out.println("\n[测试] 别名与绑定名称");
        Station a = new Station("A站");
        check(a.findName("A站") == 0, "初始名索引0");
        a.pushName("A别名");
        check(a.getStationName().equals("A别名"), "已切换到新别名");

        a.changeName(0);
        check(a.getStationName().equals("A站"), "切回原名称");

        RailWay line = new RailWay("1号线", false);
        line.pushStation(a);
        line.changeStationName(a, "A线站名");
        check(a.getBoundNameForLine(line).equals("A线站名"), "线路绑定名生效");

        // 删除别名后
        a.pushName("another");
        a.deleteName(0); // 删除 "A站"
        check(a.getStationName().equals("A别名"), "删除后切换到首个别名");
    }

    // 9. 复杂网络（多线交叉）
    static void testComplexNetwork() {
        System.out.println("\n[测试] 复杂网络（多线多点）");
        // 十字形网络
        Station c = new Station("中心");
        Station n = new Station("北");
        Station s = new Station("南");
        Station e = new Station("东");
        Station w = new Station("西");

        RailWay l1 = new RailWay("南北线", false);
        l1.connectStations(n, c, s);
        RailWay l2 = new RailWay("东西线", false);
        l2.connectStations(e, c, w);

        Station.GoToResult r = n.goTo(w);
        check(r != null, "北-西可达");
        if (r != null) {
            // 应经过中心站c，可能有换乘
            List<Station> path = r.getStations();
            check(path.contains(c), "路径经过中心站");
        }
    }

    // 10. 多路径，验证返回其中一条（最短或任意，但算法应稳定）
    static void testMultiplePaths() {
        System.out.println("\n[测试] 多路径存在性");
        Station a = new Station("A");
        Station b = new Station("B");
        Station c = new Station("C");
        Station d = new Station("D");

        // 构造两条不同线路都能从A到D
        RailWay line1 = new RailWay("L1", false);
        line1.connectStations(a, b, d);
        RailWay line2 = new RailWay("L2", false);
        line2.connectStations(a, c, d);

        Station.GoToResult r = a.goTo(d);
        check(r != null, "存在至少一条路径");
        if (r != null) {
            // 无论哪条，长度应合理
            check(r.getStations().size() >= 2, "路径长度合理");
        }
    }

    // 11. 空值处理（编译阶段无法测试抛异常，这里测试方法传入null的防御）
    static void testNullChecks() {
        System.out.println("\n[测试] 空值防御");
        try {
            new Station(null);
            check(false, "空名称应抛异常");
        } catch (IllegalArgumentException e) {
            check(true, "新建站点空名称抛出异常");
        }

        try {
            new RailWay(null, false);
            check(false, "空线路名应抛异常");
        } catch (IllegalArgumentException e) {
            check(true, "新建线路空名称抛出异常");
        }

        Station a = new Station("A");
        Station.GoToResult r = a.goTo(null);
        // goTo 内部可能直接return null，这里测试不会崩溃
        check(r == null, "目标为null时返回null或不崩溃");
    }

    // 12. 打印功能（仅确保不崩溃，无输出验证）
    static void testPrintFunctions() {
        System.out.println("\n[测试] 打印功能（不崩溃即通过）");
        Station a = new Station("A");
        Station b = new Station("B");
        RailWay line = new RailWay("1号线", false);
        line.connectStations(a, b);

        a.showNextStations();
        a.showUpStations();
        line.showRailWayStations();
        check(true, "打印方法无异常");
    }
}