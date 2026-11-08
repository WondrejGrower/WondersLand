#include "../src/backend.h"
#include "../src/theme.h"
#include "../src/translator.h"
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickItem>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QTemporaryDir>
#include <QtTest>
class Tests : public QObject {
    Q_OBJECT
    void collectOneCoin(Backend &b) {
        for (int i = 0; i < 2000 && b.state()["phase"] == "running" && b.state()["collected"].toInt() == 0;
             i++) {
            const auto obstacles = b.state()["obstacles"].toList();
            for (auto value : obstacles) {
                auto obstacle = value.toMap();
                double x = obstacle["x"].toDouble();
                if (x < 130 && x > 115 && b.state()["y"].toDouble() == 0)
                    b.jump();
            }
            b.advance(.016);
        }
        QVERIFY(b.state()["collected"].toInt() > 0);
    }
  private slots:
    void trainingCoinsNeverEnterWalletOnDeathOrReturn() {
        QTemporaryDir dir;
        auto path = dir.filePath("save.json");
        QFile save(path);
        QVERIFY(save.open(QIODevice::WriteOnly));
        save.write("{\"best\":123,\"coins\":37}");
        save.close();
        Backend b(path, false);
        b.start(true);
        collectOneCoin(b);
        b.returnToCamp();
        QCOMPARE(b.state()["wallet"].toInt(), 37);
        QCOMPARE(b.state()["best"].toInt(), 123);
        b.start(true);
        collectOneCoin(b);
        b.releaseJump();
        for (int i = 0; i < 2000 && b.state()["phase"] == "running"; i++)
            b.advance(.016);
        QCOMPARE(b.state()["phase"].toString(), "over");
        QCOMPARE(b.state()["wallet"].toInt(), 37);
        Backend restored(path, false);
        QCOMPARE(restored.state()["wallet"].toInt(), 37);
    }
    void liveCoinsBankExactlyOnceOnReturn() {
        QTemporaryDir dir;
        Backend b(dir.filePath("save"), false);
        b.acceptTransactions({QVariantMap{{"txid", QString(64, 'a')}, {"value", 1000}}});
        b.start();
        collectOneCoin(b);
        int earned = b.state()["collected"].toInt();
        b.returnToCamp();
        QCOMPARE(b.state()["wallet"].toInt(), earned);
        b.returnToCamp();
        QCOMPARE(b.state()["wallet"].toInt(), earned);
    }
    void campMovementBoundsAndStations() {
        QTemporaryDir dir;
        Backend b(dir.filePath("save"), false);
        QCOMPARE(b.state()["phase"].toString(), "camp");
        b.setMovement("right", true);
        b.advance(.05);
        QVERIFY(b.state()["campX"].toDouble() > 320);
        b.stopMovement();
        auto x = b.state()["campX"];
        b.advance(.05);
        QCOMPARE(b.state()["campX"], x);
        b.walkTo(9999, -9999);
        for (int i = 0; i < 200; i++)
            b.advance(.05);
        QCOMPARE(b.state()["campX"].toDouble(), 605.);
        QCOMPARE(b.state()["campY"].toDouble(), 175.);
        b.walkTo(112, 225);
        for (int i = 0; i < 200; i++)
            b.advance(.05);
        b.interact();
        QCOMPARE(b.state()["station"].toString(), "forge");
        b.setMovement("left", true);
        x = b.state()["campX"];
        b.advance(.05);
        QCOMPARE(b.state()["campX"], x);
        b.closeStation();
        QCOMPARE(b.state()["station"].toString(), "");
    }
    void classification() {
        QCOMPARE(Backend::plant(50000)["type"].toString(), "flower");
        QCOMPARE(Backend::plant(42000000)["type"].toString(), "cannabis");
        QCOMPARE(Backend::plant(420000000000ULL)["type"].toString(), "cannabis");
        QCOMPARE(Backend::plant(100000000000ULL)["type"].toString(), "sequoia");
    }
    void invalidFeedAndNoSilentDemo() {
        QTemporaryDir dir;
        Backend b(dir.filePath("save"), false);
        b.start();
        QCOMPARE(b.state()["phase"].toString(), "camp");
        b.acceptTransactions({QVariantMap{{"txid", "bad"}, {"value", 1000}}});
        QCOMPARE(b.state()["poolSize"].toInt(), 0);
    }
    void jumpPauseAndRestart() {
        QTemporaryDir dir;
        Backend b(dir.filePath("save"), false);
        b.start(true);
        b.jump();
        for (int i = 0; i < 10; i++)
            b.advance(.016);
        QVERIFY(b.state()["y"].toDouble() > 25);
        b.pause();
        auto before = b.state()["distance"];
        b.advance(.05);
        QCOMPARE(b.state()["distance"], before);
        b.pause();
        b.releaseJump();
        for (int i = 0; i < 70; i++)
            b.advance(.016);
        QCOMPARE(b.state()["y"].toDouble(), 0.);
        b.start(true);
        QCOMPARE(b.state()["score"].toInt(), 0);
        QVERIFY(b.state()["hit"].toMap().isEmpty());
    }
    void collisionRetainsExactTransactionAndPersists() {
        QTemporaryDir dir;
        QString file = dir.filePath("save.json"), id(64, 'a');
        {
            Backend b(file, false);
            b.acceptTransactions({QVariantMap{{"txid", id}, {"value", "123456789012"}}});
            b.start();
            for (int i = 0; i < 800 && b.state()["phase"] == "running"; i++)
                b.advance(.016);
            QCOMPARE(b.state()["phase"].toString(), "over");
            QCOMPARE(b.state()["hit"].toMap()["txid"].toString(), id);
            QCOMPARE(b.state()["hit"].toMap()["sats"].toString(), "123456789012");
            QVERIFY(b.state()["best"].toInt() > 0);
        }
        Backend restored(file, false);
        QVERIFY(restored.state()["best"].toInt() > 0);
    }
    void snapshotDoesNotMutateDuringRun() {
        QTemporaryDir dir;
        Backend b(dir.filePath("save"), false);
        b.acceptTransactions({QVariantMap{{"txid", QString(64, 'a')}, {"value", 1000}}});
        b.start();
        b.acceptTransactions({QVariantMap{{"txid", QString(64, 'b')}, {"value", "100000000000"}}});
        b.advance(.016);
        QCOMPARE(b.state()["obstacles"].toList().first().toMap()["txid"].toString(), QString(64, 'a'));
    }
    void realQmlAndKeyboard() {
        QQuickStyle::setStyle("Material");
        QTemporaryDir dir;
        Backend b(dir.filePath("save"), false);
        Theme theme(dir.path());
        QFile language(dir.filePath("language"));
        QVERIFY(language.open(QIODevice::WriteOnly));
        language.write("cs\n");
        language.close();
        Translator translator(dir.filePath("language"));
        QCoreApplication::installTranslator(&translator);
        QQmlApplicationEngine engine;
        connect(&translator, &Translator::changed, &engine, &QQmlApplicationEngine::retranslate);
        engine.rootContext()->setContextProperty("backend", &b);
        engine.rootContext()->setContextProperty("theme", &theme);
        engine.rootContext()->setContextProperty("translator", &translator);
        engine.load(QUrl("qrc:/Main.qml"));
        QVERIFY(!engine.rootObjects().isEmpty());
        auto window = qobject_cast<QQuickWindow *>(engine.rootObjects().first());
        QVERIFY(window);
        window->requestActivate();
        QTest::qWait(40);
        window->findChild<QQuickItem *>("gameRoot")->forceActiveFocus();
        auto campX = b.state()["campX"].toDouble();
        QTest::keyPress(window, Qt::Key_D);
        QTest::qWait(120);
        QTest::keyRelease(window, Qt::Key_D);
        QVERIFY(b.state()["campX"].toDouble() > campX);
        b.walkTo(465, 290);
        for (int i = 0; i < 200; i++)
            b.advance(.016);
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["station"].toString(), "training");
        auto button = window->findChild<QQuickItem *>("campTraining");
        QVERIFY(button);
        QTest::qWait(80);
        QVERIFY(button->isVisible());
        QVERIFY(button->width() > 0);
        button->forceActiveFocus();
        QTest::keyClick(window, Qt::Key_E);
        QTRY_COMPARE(b.state()["phase"].toString(), "running");
        QTest::keyPress(window, Qt::Key_Space);
        QTest::qWait(120);
        QVERIFY(b.state()["y"].toDouble() > 0);
        QTest::keyRelease(window, Qt::Key_Space);
        QTest::keyClick(window, Qt::Key_P);
        QTest::qWait(50);
        QCOMPARE(b.state()["phase"].toString(), "paused");
        QCOMPARE(translator.language(), QString("cs"));
        QCOMPARE(window->findChild<QObject *>("stateTitle")->property("text").toString(),
                 QString("Chvilka na vydechnutí."));
        QVERIFY(window->grabWindow().save("/tmp/wondersland-game-cs.png"));
        QTest::keyClick(window, Qt::Key_B);
        QCOMPARE(b.state()["phase"].toString(), "camp");
        // Reach the live gate using keyboard movement, then confirm with E.
        QTest::keyPress(window, Qt::Key_D);
        for (int i = 0; i < 16; i++)
            b.advance(.05);
        QTest::keyRelease(window, Qt::Key_D);
        QTest::keyPress(window, Qt::Key_W);
        for (int i = 0; i < 16; i++)
            b.advance(.05);
        QTest::keyRelease(window, Qt::Key_W);
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["station"].toString(), "portal");
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["phase"].toString(), "camp"); // No live data yet.
        b.acceptTransactions({QVariantMap{{"txid", QString(64, 'a')}, {"value", 1000}}});
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["phase"].toString(), "running");
        QCOMPARE(b.state()["demo"].toBool(), false);
        QTest::keyClick(window, Qt::Key_Escape);
        QCOMPARE(b.state()["phase"].toString(), "paused");
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["phase"].toString(), "running");
        for (int i = 0; i < 1000 && b.state()["phase"] == "running"; i++)
            b.advance(.016);
        QCOMPARE(b.state()["phase"].toString(), "over");
        QTest::keyClick(window, Qt::Key_R);
        QCOMPARE(b.state()["phase"].toString(), "running");
        QTest::keyClick(window, Qt::Key_B);
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(b.state()["station"].toString(), "portal");
        QTest::keyClick(window, Qt::Key_Escape);
        QCOMPARE(b.state()["station"].toString(), "");
        QTest::qWait(60);
        QVERIFY(window->grabWindow().save("/tmp/wondersland-game-camp-cs.png"));
        QVERIFY(language.open(QIODevice::WriteOnly | QIODevice::Truncate));
        language.write("en\n");
        language.close();
        QTRY_COMPARE(translator.language(), QString("en"));
        window->resize(720, 540);
        QTest::qWait(80);
        QVERIFY(window->grabWindow().save("/tmp/wondersland-game-small-en.png"));
    }
};
QTEST_MAIN(Tests)
#include "game_tests.moc"
