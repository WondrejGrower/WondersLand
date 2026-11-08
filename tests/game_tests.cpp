#include "../src/backend.h"
#include "../src/balance.h"
#include "../src/progress.h"
#include "../src/theme.h"
#include "../src/translator.h"
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickItem>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QTemporaryDir>
#include <QtTest>
#include <cmath>
class Tests : public QObject {
    Q_OBJECT
    QVariantMap character(QString cls = "gardener") {
        return {{"name", "Willow"},  {"class", cls},       {"hair", "#5e3936"},
                {"skin", "#dfaf87"}, {"shirt", "#679e86"}, {"hairStyle", 1}};
    }
    QString fixture(QTemporaryDir &dir, bool strong = false, QString cls = "gardener") {
        auto path = dir.filePath("save.json");
        Progress p(path);
        p.create(character(cls));
        if (strong) {
            p.data["coins"] = 100000;
            p.data["runs"] = 1;
            p.data["tier"] = 6;
            p.data["workshop"] =
                QVariantMap{{"strength", 50}, {"agility", 50}, {"magnet", 50}, {"luck", 50}, {"yield", 50}};
            p.data["owned"] = QStringList{"hands", "boots"};
            p.data["hands"] = true;
            p.data["boots"] = true;
            p.data["completed"] = QStringList{"leaf", "air", "spore", "stable"};
            p.save();
        }
        return path;
    }
    QVariantMap tx(int i, qulonglong sats = 1000) {
        return {{"txid", QString("%1").arg(i, 64, 16, QChar('0'))}, {"value", QString::number(sats)}};
    }
    void begin(Backend &b, bool demo = true, QString id = "") {
        int chosen = 0;
        bool found = id.isEmpty();
        for (int attempt = 0; attempt < 100; attempt++) {
            b.start(demo);
            QCOMPARE(b.state()["phase"].toString(), "select");
            auto options = b.state()["choices"].toList();
            for (int i = 0; i < options.size(); i++)
                if (options[i].toMap()["id"] == id) {
                    chosen = i;
                    found = true;
                    break;
                }
            if (found)
                break;
        }
        QVERIFY(found);
        b.chooseSkill(chosen);
        QCOMPARE(b.state()["phase"].toString(), "running");
    }
    void collect(Backend &b) {
        for (int i = 0; i < 1500 && b.state()["phase"] == "running" && b.state()["collected"].toInt() == 0;
             i++) {
            for (auto v : b.state()["obstacles"].toList()) {
                double x = v.toMap()["x"].toDouble();
                if (x < 170 && x > 150 && b.state()["y"].toDouble() == 0)
                    b.jump();
            }
            b.advance(.016);
        }
        QVERIFY(b.state()["collected"].toInt() > 0);
    }
  private slots:
    void initTestCase() { QQuickStyle::setStyle("Material"); }
    void curveIsMonotonicAndHasNoHeightCeiling() {
        double previous = 0;
        for (qulonglong n = 0; n < 100; n++) {
            double h = Balance::height(n);
            QVERIFY(std::isfinite(h) && h >= previous);
            previous = h;
        }
        for (double n = 100; n <= 2.1e15; n *= 1.05) {
            double h = Balance::height(qulonglong(n));
            QVERIFY(h >= previous && std::isfinite(h));
            previous = h;
        }
        QCOMPARE(Balance::height(100000), 12.);
        QCOMPARE(Balance::height(100000000), 72.);
        QVERIFY(Balance::height(10000000000000ULL) > Balance::height(1000000000000ULL));
        auto herb = Backend::plant(420000000000ULL);
        QCOMPARE(herb["type"].toString(), "cannabis");
        QCOMPARE(herb["h"].toDouble(), Balance::height(420000000000ULL));
        QVERIFY(Backend::plant(1000000000, 3)["h"].toDouble() >
                Backend::plant(1000000000, 1)["h"].toDouble());
    }
    void queueIsBoundedReproducibleAndDoesNotRepeat() {
        QVariantList rows;
        for (int i = 1; i < 700; i++)
            rows.append(tx(i));
        TransactionQueue a, b;
        a.receive(rows);
        b.receive(rows);
        QVERIFY(a.size() <= 512);
        a.begin(77);
        b.begin(77);
        QSet<QString> ids;
        for (int i = 0; i < 512; i++) {
            auto row = a.take();
            QCOMPARE(row, b.take());
            auto id = row["txid"].toString();
            QVERIFY(!ids.contains(id));
            ids.insert(id);
        }
        QVERIFY(a.take().isEmpty());
        a.receive({tx(900)});
        QCOMPARE(a.take()["txid"], tx(900)["txid"]);
        a.receive({QVariantMap{{"txid", "invalid"}, {"value", 1}}});
        QVERIFY(a.take().isEmpty());
    }
    void existingObstacleLocksItsTransactionAndSize() {
        QTemporaryDir dir;
        Backend b(fixture(dir), false);
        b.acceptTransactions({tx(1, 1000)});
        begin(b, false);
        b.advance(.016);
        auto old = b.state()["obstacles"].toList().first().toMap();
        b.acceptTransactions({tx(1, 200000000000ULL), tx(2)});
        auto after = b.state()["obstacles"].toList().first().toMap();
        QCOMPARE(old, after);
    }
    void exhaustionPausesAllGameTimeAndResumesWithCountdown() {
        QTemporaryDir dir;
        Backend b(fixture(dir), false);
        b.acceptTransactions({tx(1, 0)});
        begin(b, false);
        for (int i = 0; i < 1000 && b.state()["phase"] == "running"; i++)
            b.advance(.016);
        QCOMPARE(b.state()["phase"].toString(), "waiting");
        auto time = b.state()["time"], distance = b.state()["distance"];
        for (int i = 0; i < 100; i++)
            b.advance(.05);
        QCOMPARE(b.state()["time"], time);
        QCOMPARE(b.state()["distance"], distance);
        b.pause();
        b.acceptTransactions({tx(2, 0)});
        QCOMPARE(b.state()["phase"].toString(), "paused");
        b.pause();
        QCOMPARE(b.state()["phase"].toString(), "countdown");
        for (int i = 0; i < 50; i++)
            b.advance(.05);
        QCOMPARE(b.state()["time"], time);
        for (int i = 0; i < 30; i++)
            b.advance(.05);
        QCOMPARE(b.state()["phase"].toString(), "running");
        QVERIFY(b.state()["time"].toDouble() > time.toDouble());
    }
    void actualTrajectoriesRespectOrdinaryAndAirCaps() {
        for (auto cls : {"gardener", "explorer", "collector"}) {
            QTemporaryDir dir;
            Backend b(fixture(dir, true, cls), false);
            begin(b, true, "leap");
            b.jump();
            double peak = 0;
            for (int i = 0; i < 160; i++) {
                b.advance(.005);
                peak = std::max(peak, b.state()["y"].toDouble());
            }
            QVERIFY2(peak <= 110.05, qPrintable(QString::number(peak)));
            b.returnToCamp();
            begin(b, true, "double");
            b.jump();
            for (int i = 0; i < 250; i++) {
                if (i % 5 == 0)
                    b.jump();
                b.fly(true);
                b.advance(.005);
                QVERIFY(b.state()["y"].toDouble() <= 170.05);
            }
            b.fly(false);
            b.releaseJump();
            for (int i = 0; i < 600; i++)
                b.advance(.005);
            QCOMPARE(b.state()["y"].toDouble(), 0.);
        }
    }
    void impulseEnergyLeavesNoInvisibleCeiling() {
        for (double y = 0; y < 171; y += .25) {
            double v = Balance::extraImpulse(y, 1000);
            QVERIFY(y + v * v / (2 * 570) <= std::max(170., y) + .00001);
        }
        QVERIFY(Balance::jumpVelocity(100) < 355);
    }
    void giantTransactionEndsRunAndPreservesExactIdentity() {
        QTemporaryDir dir;
        Backend b(fixture(dir), false);
        auto row = tx(11, 2000000000000000ULL);
        b.acceptTransactions({row});
        begin(b, false);
        for (int i = 0; i < 1000 && b.state()["phase"] == "running"; i++) {
            if (i % 50 == 0)
                b.jump();
            b.advance(.016);
        }
        QCOMPARE(b.state()["phase"].toString(), "over");
        QCOMPARE(b.state()["hit"].toMap()["txid"], row["txid"]);
        QCOMPARE(b.state()["hit"].toMap()["sats"].toString(), row["value"].toString());
        QVERIFY(b.state()["hit"].toMap()["h"].toDouble() > 170);
        QFile trace(dir.filePath("last-trace.json"));
        QVERIFY(trace.open(QIODevice::ReadOnly));
        auto diagnostic = QJsonDocument::fromJson(trace.readAll()).toVariant().toMap();
        QCOMPARE(diagnostic["class"].toString(), QString("gardener"));
        QVERIFY(diagnostic["result"].toMap()["seconds"].toDouble() > 0);
    }
    void trainingNeverAwardsPersistentProgress() {
        QTemporaryDir dir;
        auto path = fixture(dir, true);
        Backend b(path, false);
        auto before = b.state()["profile"].toMap();
        begin(b, true, "magnet");
        collect(b);
        b.returnToCamp();
        auto after = b.state()["profile"].toMap();
        for (auto key : {"coins", "tier", "milestones", "runs", "records", "seeds"})
            QCOMPARE(before[key], after[key]);
        begin(b, true, "magnet");
        for (int i = 0; i < 1000 && b.state()["phase"] == "running"; i++)
            b.advance(.016);
        b.returnToCamp();
        Backend loaded(path, false);
        QCOMPARE(loaded.state()["wallet"], before["coins"]);
    }
    void rewardsAndMilestonesSurviveReloadExactlyOnce() {
        QTemporaryDir dir;
        auto path = fixture(dir);
        {
            Progress p(path);
            p.reward("run-one", 1, 300, 50, 900, "gardener");
            auto before = p.data;
            p.reward("run-one", 1, 300, 50, 900, "gardener");
            QCOMPARE(p.data, before);
            QCOMPARE(p.data["tier"].toInt(), 2);
            QCOMPARE(p.data["seeds"].toInt(), 3);
        }
        Progress p(path);
        auto before = p.data;
        p.reward("run-one", 1, 300, 50, 900, "gardener");
        QCOMPARE(p.data, before);
        p.reward("another", 1, 300, 0, 800, "gardener");
        QCOMPARE(p.data["seeds"].toInt(), 3);
    }
    void firstThreeTiersUnlockAndApplyTheirCoinMultipliers() {
        QTemporaryDir dir;
        auto path = fixture(dir);
        Progress p(path);
        p.reward("t1-short", 1, 179, 0, 1, "gardener");
        QCOMPARE(p.data["tier"].toInt(), 1);
        p.reward("t1", 1, 180, 0, 2, "gardener");
        QCOMPARE(p.data["tier"].toInt(), 2);
        p.reward("t2-short", 2, 239, 0, 2, "gardener");
        QCOMPARE(p.data["tier"].toInt(), 2);
        p.reward("t2", 2, 240, 0, 3, "gardener");
        QCOMPARE(p.data["tier"].toInt(), 3);
        p.reward("t3", 3, 300, 0, 4, "gardener");
        QCOMPARE(p.data["tier"].toInt(), 4);
        for (int tier = 1; tier <= 3; tier++) {
            QTemporaryDir runDir;
            auto runPath = fixture(runDir);
            Progress setup(runPath);
            setup.data["tier"] = 3;
            setup.save();
            Backend b(runPath, false);
            b.setTier(tier);
            QVariantList rows;
            for (int i = 1; i < 20; i++)
                rows.append(tx(i, 0));
            b.acceptTransactions(rows);
            begin(b, false, "magnet");
            for (int i = 0; i < 1800 && b.state()["collected"].toInt() < 2; i++) {
                for (auto value : b.state()["obstacles"].toList()) {
                    double x = value.toMap()["x"].toDouble();
                    if (x < 170 && x > 150 && b.state()["y"].toDouble() == 0)
                        b.jump();
                }
                b.advance(.008);
            }
            int collected = b.state()["collected"].toInt();
            QVERIFY(collected >= 2);
            double multiplier = Balance::list("tiers")[tier - 1].toMap()["coins"].toDouble();
            int earned = int(collected * 1.1 * multiplier);
            QCOMPARE(b.state()["earned"].toInt(), earned);
            b.returnToCamp();
            QCOMPARE(b.state()["wallet"].toInt(), earned);
        }
    }
    void recordedDatasetsHaveSeparateRecordsAndNoRewards() {
        QTemporaryDir dir;
        auto path = fixture(dir);
        Progress p(path);
        p.reward("replay1", 1, 500, 900, 999, "gardener", "replay:42");
        QCOMPARE(p.data["coins"].toInt(), 0);
        QCOMPARE(p.data["tier"].toInt(), 1);
        QCOMPARE(p.data["seeds"].toInt(), 0);
        QCOMPARE(p.data["runs"].toInt(), 0);
        QVERIFY(p.data["records"].toMap().contains(Balance::version() + ":replay:42:T1:gardener"));
    }
    void legacyImportResetAndDamagedSave() {
        QTemporaryDir dir;
        auto path = dir.filePath("save");
        {
            QFile f(path);
            QVERIFY(f.open(QIODevice::WriteOnly));
            f.write("{\"coins\":123,\"best\":500}");
        }
        {
            Progress p(path);
            QVERIFY(p.create(character()));
            QCOMPARE(p.data["coins"].toInt(), 123);
            QVERIFY(!p.create(character()));
            QVERIFY(!p.reset(false));
            QCOMPARE(p.data["coins"].toInt(), 123);
            QVERIFY(p.reset(true));
        }
        Progress p(path);
        QVERIFY(p.create(character()));
        QCOMPARE(p.data["coins"].toInt(), 0);
        {
            QFile f(path);
            QVERIFY(f.open(QIODevice::WriteOnly | QIODevice::Truncate));
            f.write("damaged");
        }
        Progress bad(path);
        QVERIFY(!bad.error.isEmpty());
        QVERIFY(!bad.create(character()));
        QVERIFY(!bad.save());
        QFile f(path);
        QVERIFY(f.open(QIODevice::ReadOnly));
        QCOMPARE(f.readAll(), QByteArray("damaged"));
    }
    void workshopEquipmentAndRealTimeResearch() {
        QTemporaryDir dir;
        auto path = fixture(dir, true);
        Progress p(path);
        QVERIFY(!p.buy("strength"));
        auto levels = p.data["workshop"].toMap();
        levels["strength"] = 0;
        p.data["workshop"] = levels;
        int coins = p.data["coins"].toInt();
        QVERIFY(p.buy("strength"));
        QCOMPARE(p.data["coins"].toInt(), coins - 50);
        p.data["milestones"] = QStringList{"T1:60", "T2:120"};
        p.data["completed"] = QStringList{};
        p.data["seeds"] = 3;
        QVERIFY(p.research("leaf", 1000));
        QVERIFY(!p.research("leaf", 1000));
        int charged = p.data["coins"].toInt();
        p.updateResearch(900);
        QCOMPARE(p.data["completed"].toStringList().size(), 0);
        p.updateResearch(1600);
        QVERIFY(p.data["completed"].toStringList().contains("leaf"));
        QCOMPARE(p.data["coins"].toInt(), charged);
        QVERIFY(!p.research("leaf", 1700));
        p.save();
        Progress loaded(path);
        QCOMPARE(loaded.data["completed"].toStringList(), p.data["completed"].toStringList());
    }
    void wideTreeConsumesOnlyOneRescueAndTotalBudgetIsFinite() {
        QTemporaryDir dir;
        Backend b(fixture(dir, true), false);
        b.acceptTransactions(
            {tx(1, 2000000000000000ULL), tx(2, 2000000000000000ULL), tx(3, 2000000000000000ULL)});
        bool found = false;
        for (int attempt = 0; attempt < 60 && !found; attempt++) {
            b.start(false);
            auto offers = b.state()["choices"].toList();
            for (int i = 0; i < offers.size(); i++)
                if (offers[i].toMap()["id"] == "shield") {
                    b.chooseSkill(i);
                    found = true;
                    break;
                }
        }
        QVERIFY(found);
        QCOMPARE(b.state()["rescuesGranted"].toInt(), 2);
        int previous = 2, transitions = 0;
        for (int i = 0; i < 1500 && b.state()["phase"] == "running"; i++) {
            b.advance(.016);
            int now = b.state()["rescues"].toInt();
            if (now < previous) {
                QCOMPARE(previous - now, 1);
                transitions++;
                previous = now;
            }
            QVERIFY(b.state()["rescuesGranted"].toInt() <= 2);
        }
        QCOMPARE(transitions, 2);
        QCOMPARE(b.state()["phase"].toString(), "over");
    }
    void cancellingSkillSelectionDoesNotCountAsCompletedRun() {
        QTemporaryDir dir;
        Backend b(fixture(dir), false);
        b.acceptTransactions({tx(1)});
        b.start(false);
        QCOMPARE(b.state()["phase"].toString(), "select");
        b.returnToCamp();
        QCOMPARE(b.state()["profile"].toMap()["runs"].toInt(), 0);
    }
    void pauseAndInactiveWindowFreezeRun() {
        QTemporaryDir dir;
        Backend b(fixture(dir), false);
        begin(b);
        b.advance(.02);
        b.pause();
        auto time = b.state()["time"];
        b.advance(.05);
        QCOMPARE(b.state()["time"], time);
        b.pause();
        b.setActive(false);
        b.advance(.05);
        QCOMPARE(b.state()["time"], time);
        b.setActive(true);
    }

    void jetpackRunsOutAndNeverBreachesAirCap() {
        QTemporaryDir dir;
        Backend b(fixture(dir, true, "explorer"), false);
        bool found = false;
        for (int a = 0; a < 80 && !found; a++) {
            b.start(true);
            auto choices = b.state()["choices"].toList();
            for (int i = 0; i < choices.size(); i++)
                if (choices[i].toMap()["id"] == "jetpack") {
                    b.chooseSkill(i);
                    found = true;
                    break;
                }
        }
        QVERIFY(found);
        b.fly(true);
        for (int i = 0; i < 800; i++) {
            if (i % 30 == 0)
                b.jump();
            b.advance(.005);
            QVERIFY(b.state()["y"].toDouble() <= 170.05);
        }
        QCOMPARE(b.state()["fuel"].toDouble(), 0.);
        b.fly(false);
        b.releaseJump();
        for (int i = 0; i < 400; i++)
            b.advance(.005);
        QCOMPARE(b.state()["y"].toDouble(), 0.);
    }
    void flyingSkillsHaveBoundedSlotsAndRanks() {
        QTemporaryDir dir;
        Backend b(fixture(dir, true), false);
        QVariantList rows;
        for (int i = 0; i < 512; i++)
            rows.append(tx(i + 1, 0));
        b.acceptTransactions(rows);
        begin(b, false);
        for (int i = 0; i < 6000 && b.state()["phase"] == "running"; i++)
            b.advance(.05);
        QVERIFY(b.state()["time"].toDouble() > 100);
        int count = 0;
        for (auto v : b.state()["skillHud"].toList()) {
            auto skill = v.toMap();
            if (skill["rank"].toInt()) {
                count++;
                QVERIFY(skill["rank"].toInt() <= skill["maxRank"].toInt());
            }
        }
        QVERIFY(count <= 6);
        QVERIFY(count >= 2);
        QVERIFY(b.state()["rescuesGranted"].toInt() <= 2);
    }
    void nativeKeyboardCycleAndTypingDoesNotTriggerShortcuts() {
        QTemporaryDir dir;
        Backend b(dir.filePath("save"), false);
        Theme theme(dir.path());
        Translator translator(dir.filePath("language"));
        QCoreApplication::installTranslator(&translator);
        QQmlApplicationEngine engine;
        engine.rootContext()->setContextProperty("backend", &b);
        engine.rootContext()->setContextProperty("theme", &theme);
        engine.rootContext()->setContextProperty("translator", &translator);
        engine.load(QUrl("qrc:/Main.qml"));
        QVERIFY(!engine.rootObjects().isEmpty());
        auto window = qobject_cast<QQuickWindow *>(engine.rootObjects().first());
        window->requestActivate();
        QTest::qWait(60);
        auto field = window->findChild<QQuickItem *>("characterName");
        QVERIFY(field);
        field->forceActiveFocus();
        for (auto key : {Qt::Key_Q, Qt::Key_P, Qt::Key_E})
            QTest::keyClick(window, key);
        QCOMPARE(field->property("text").toString().toUpper(), QString("QPE"));
        QCOMPARE(b.state()["phase"].toString(), "creation");
        auto create = window->findChild<QQuickItem *>("createCharacter");
        create->forceActiveFocus();
        QTest::keyClick(window, Qt::Key_Space);
        QTRY_COMPARE(b.state()["phase"].toString(), "camp");
        b.acceptTransactions({tx(1, 1000000000000000ULL)});
        b.walkTo(540, 215);
        for (int i = 0; i < 200; i++)
            b.advance(.05);
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["station"].toString(), "portal");
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["phase"].toString(), "select");
        QTest::keyClick(window, Qt::Key_1);
        QCOMPARE(b.state()["phase"].toString(), "running");
        QTest::keyPress(window, Qt::Key_Space);
        QTest::qWait(100);
        QTest::keyRelease(window, Qt::Key_Space);
        QVERIFY(b.state()["y"].toDouble() > 0);
        QTest::keyClick(window, Qt::Key_P);
        QCOMPARE(b.state()["phase"].toString(), "paused");
        QTest::keyClick(window, Qt::Key_B);
        QCOMPARE(b.state()["phase"].toString(), "camp");
        QTest::qWait(60);
        QVERIFY(window->grabWindow().save("/tmp/wl-03-camp.png"));
        QTest::keyClick(window, Qt::Key_F11);
        QTRY_COMPARE(window->visibility(), QWindow::FullScreen);
        QTest::keyClick(window, Qt::Key_F11);
        QTRY_COMPARE(window->visibility(), QWindow::Windowed);
    }
};
QTEST_MAIN(Tests)
#include "game_tests.moc"
