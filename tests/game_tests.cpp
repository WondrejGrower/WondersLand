#include "../src/backend.h"
#include "../src/balance.h"
#include "../src/progress.h"
#include "../src/theme.h"
#include "../src/translator.h"
#include <QFile>
#include <QJSEngine>
#include <QJsonArray>
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
    QQuickItem *itemNamed(QQuickItem *root, const QString &name) {
        if (root->objectName() == name)
            return root;
        for (auto item : root->childItems())
            if (auto found = itemNamed(item, name))
                return found;
        return nullptr;
    }
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
            p.data["runs"] = 5;
            p.data["totalDistance"] = 7000;
            p.data["bestDistance"] = 3500;
            p.updateUnlocks(false);
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
        b.start(demo);
        QCOMPARE(b.state()["phase"].toString(), "select");
        const auto options = b.state()["choices"].toList();
        int chosen = 0;
        bool found = id.isEmpty();
        for (int i = 0; i < options.size(); i++)
            if (options[i].toMap()["id"] == id) { chosen = i; found = true; break; }
        b.chooseSkill(chosen);
        if (!found) {
            // Advanced abilities are fixtures, not entries in the new starter menu.
            b.skills.clear();
            b.cachedStats.clear();
            auto offer = Balance::find("skills", id);
            QVERIFY(!offer.isEmpty());
            offer["nextRank"] = offer["gain"] = 1;
            b.applySkill(offer);
        }
        QCOMPARE(b.state()["phase"].toString(), "running");
    }
    void collect(Backend &b) {
        for (int i = 0; i < 1500 && b.state()["phase"] == "running" && b.state()["collected"].toInt() == 0;
             i++) {
            for (auto v : b.state()["obstacles"].toList()) {
                double x = v.toMap()["x"].toDouble();
                if (x < 140 && x > 125 && b.state()["y"].toDouble() == 0) {
                    b.jump();
                    b.releaseJump(); // A short controlled hop also works with high Strength.
                }
            }
            b.advance(.016);
        }
        QVERIFY(b.state()["collected"].toInt() > 0);
    }
  private slots:
    void movementStartersAndCooldowns() {
        QTemporaryDir dir;
        Backend b(fixture(dir), false);
        b.start(true);
        const auto choices = b.state()["choices"].toList();
        QCOMPARE(choices.size(), 3);
        const QStringList ids{"leap", "timeslow", "double"};
        for (int i = 0; i < 3; i++) {
            QCOMPARE(choices[i].toMap()["id"].toString(), ids[i]);
            QCOMPARE(choices[i].toMap()["nextRank"].toInt(), 1);
        }
        QCOMPARE(choices[0].toMap()["name"].toString(), QString("Basic Jump"));
        QCOMPARE(choices[0].toMap()["effects"].toList()[0].toDouble(), .15);
        b.chooseSkill(2);
        b.spawn = 1e9;
        b.jump(); b.advance(.1); b.jump();
        QCOMPARE(b.doubleCooldown, 10.);
        QVERIFY(b.airJumpUsed);
        for (const auto &phase : {"paused", "waiting", "countdown"}) {
            b.phase = phase; b.countdown = 3;
            b.advance(.1);
            QCOMPARE(b.doubleCooldown, 10.);
        }
        b.phase = "running";
        b.y = 0; b.jump(); b.advance(.01); b.jump();
        QVERIFY(!b.airJumpUsed);
        for (int i = 0; i < 1190; i++) b.advance(1. / 120);
        QVERIFY(b.doubleCooldown > 0);
        b.advance(.1);
        QCOMPARE(b.doubleCooldown, 0.);
        b.y = 0; b.jump(); b.advance(.01); b.jump();
        QCOMPARE(b.doubleCooldown, 10.);
        QTemporaryDir normalDir, slowDir;
        Backend normal(fixture(normalDir), false), slow(fixture(slowDir), false);
        begin(normal); normal.skills.clear(); normal.cachedStats.clear();
        begin(slow, true, "timeslow");
        normal.spawn = slow.spawn = 1e9;
        normal.jump(); slow.jump();
        QCOMPARE(slow.stats()["timeScale"].toDouble(), .85);
        for (int i = 0; i < 120; i++) { normal.advance(.85 / 120); slow.advance(1. / 120); }
        QVERIFY(std::abs(normal.y - slow.y) < 1e-8);
        QVERIFY(std::abs(normal.distance - slow.distance) < 1e-8);
    }
    void sharedJumpProgressionFixtures() {
        QFile data(QFINDTESTDATA("jump-stats.json"));
        QVERIFY(data.open(QIODevice::ReadOnly));
        for (const auto &entry : QJsonDocument::fromJson(data.readAll()).array()) {
            const auto row = entry.toObject();
            QTemporaryDir dir;
            const auto path = fixture(dir, false, row["role"].toString());
            Progress p(path);
            p.data["workshop"] = QVariantMap{{"strength", row["level"].toInt()}};
            QVERIFY(p.save());
            Backend b(path, false);
            const auto stats = b.state()["stats"].toMap();
            QVERIFY(std::abs(stats["jumpVelocity"].toDouble() - row["jumpVelocity"].toDouble()) < 1e-8);
            QVERIFY(std::abs(stats["airCap"].toDouble() - row["airCap"].toDouble()) < 1e-8);
        }
    }
    void sharedPlantVisualFixtures() {
        QFile source(":/PlantVisual.js");
        QVERIFY(source.open(QIODevice::ReadOnly));
        QString script = QString::fromUtf8(source.readAll());
        script.remove(".pragma library");
        QJSEngine engine;
        QVERIFY(!engine.evaluate(script).isError());
        QFile fixtures(QFINDTESTDATA("plant-visual.json"));
        QVERIFY(fixtures.open(QIODevice::ReadOnly));
        for (const auto &value : QJsonDocument::fromJson(fixtures.readAll()).array()) {
            const auto f = value.toObject();
            const auto sats = f["sats"].toString().toULongLong();
            QCOMPARE(Balance::height(sats), f["h"].toDouble());
            QCOMPARE(Balance::width(Balance::height(sats)), f["w"].toDouble());
            const auto visual = engine.globalObject().property("descriptor").call({
                Balance::species(sats), f["sats"].toString(), f["h"].toDouble(),
                f["txid"].toString(), f["fixture"].toString()});
            QVERIFY(!visual.isError());
            QCOMPARE(QJsonObject::fromVariantMap(visual.toVariant().toMap()), f["visual"].toObject());
        }
    }

    void agilitySlowsGameTimeWithoutChangingPhysicsOrCamp() {
        QTemporaryDir lowDir, highDir;
        auto lowPath = fixture(lowDir), highPath = fixture(highDir);
        Progress highSave(highPath);
        highSave.data["workshop"] = QVariantMap{{"agility", 50}};
        QVERIFY(highSave.save());
        Backend normal(lowPath, false), slow(highPath, false);
        QCOMPARE(normal.state()["stats"].toMap()["timeScale"].toDouble(), 1.0);
        QCOMPARE(slow.state()["stats"].toMap()["timeScale"].toDouble(), 0.98);
        QCOMPARE(slow.state()["stats"].toMap()["buffer"], normal.state()["stats"].toMap()["buffer"]);
        QVariantList rows; for (int i = 0; i < 40; i++) rows.append(tx(i, 0));
        normal.setReplay(rows, 42); slow.setReplay(rows, 42);
        normal.start(false); slow.start(false); normal.chooseSkill(0); slow.chooseSkill(0);
        normal.jump(); slow.jump();
        for (int i = 0; i < 120; i++) { normal.advance(.98 / 120); slow.advance(1.0 / 120); }
        for (auto key : {"time", "distance", "y", "velocity"})
            QVERIFY2(std::abs(normal.state()[key].toDouble() - slow.state()[key].toDouble()) < 1e-8, key);
        normal.returnToCamp(); slow.returnToCamp();
        normal.setMovement("right", true); slow.setMovement("right", true);
        normal.advance(.1); slow.advance(.1);
        QCOMPARE(normal.state()["campX"], slow.state()["campX"]);
    }
    void clothingInventoryAndMigration() {
        QTemporaryDir dir;
        Progress p(dir.filePath("progress.json"));
        auto c = character(); c["hairStyle"] = 15;
        QVERIFY(p.create(c));
        QCOMPARE(p.data["schemaVersion"].toInt(), 5);
        QCOMPARE(p.data["inventory"].toStringList().size(), 5);
        QVERIFY(p.data["owned"].toStringList().isEmpty());
        QVERIFY(!p.data["hands"].toBool()); QVERIFY(!p.data["boots"].toBool());
        QVERIFY(!p.equipClothing("head_straw_hat"));
        QVERIFY(!p.takeClothing("hands"));
        QVERIFY(p.takeClothing("torso_rust_coat"));
        QVERIFY(!p.takeClothing("torso_rust_coat"));
        QVERIFY(p.equipClothing("torso_rust_coat"));
        QCOMPARE(p.data["equipment"].toMap()["torso"].toString(), QString("torso_rust_coat"));
        QVERIFY(p.data["inventory"].toStringList().contains("torso_green_tunic"));
        QVERIFY(p.equipClothing("hands_leather_work_gloves"));
        QVERIFY(p.data["equipment"].toMap()["hands"].toString().isEmpty());
        Progress reloaded(p.path);
        for (auto slot : {"head", "torso", "legs", "feet", "hands", "belt"})
            QCOMPARE(reloaded.data["equipment"].toMap()[slot].toString(), p.data["equipment"].toMap()[slot].toString());
        QCOMPARE(reloaded.data["character"].toMap()["hairStyle"].toInt(), 15);
        // A schema-4 save retains old gameplay abilities and all earned progress.
        p.data["schemaVersion"] = 4; p.data.remove("inventory"); p.data.remove("equipment");
        p.data["owned"] = QStringList{"hands", "boots"}; p.data["hands"] = true; p.data["boots"] = true;
        p.data["coins"] = 777; QVERIFY(p.save());
        Progress migrated(p.path);
        QVERIFY(migrated.error.isEmpty()); QVERIFY(QFile::exists(p.path + ".pre-v5"));
        QCOMPARE(migrated.data["character"], p.data["character"]);
        QCOMPARE(migrated.data["owned"].toStringList(), p.data["owned"].toStringList());
        QCOMPARE(migrated.data["coins"].toInt(), 777);
        QVERIFY(migrated.data["hands"].toBool()); QVERIFY(migrated.data["boots"].toBool());
        QCOMPARE(migrated.data["inventory"].toStringList().size(), 5);
        Progress twice(p.path); QCOMPARE(twice.data["inventory"].toStringList(), migrated.data["inventory"].toStringList());
        QVERIFY(twice.reset(true)); QVERIFY(twice.data["inventory"].toStringList().isEmpty());
    }
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
        QVERIFY(Backend::plant(1000000000, 3)["h"].toDouble() ==
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
            b.spawn = 1e9;
            b.jump();
            double peak = 0;
            for (int i = 0; i < 400; i++) {
                b.advance(.005);
                peak = std::max(peak, b.state()["y"].toDouble());
            }
            QVERIFY2(peak <= Balance::number("physics", "jumpCap") + .05, qPrintable(QString::number(peak)));
            b.returnToCamp();
            begin(b, true, "double");
            b.spawn = 1e9;
            b.jump();
            for (int i = 0; i < 250; i++) {
                if (i % 5 == 0)
                    b.jump();
                b.fly(true);
                b.advance(.005);
                QVERIFY(b.state()["y"].toDouble() <= b.state()["stats"].toMap()["airCap"].toDouble() + .05);
            }
            b.fly(false);
            b.releaseJump();
            for (int i = 0; i < 600; i++)
                b.advance(.005);
            QCOMPARE(b.state()["y"].toDouble(), 0.);
        }
    }
    void impulseEnergyLeavesNoInvisibleCeiling() {
        for (double y = 0; y < Balance::number("physics", "airCap") + 1; y += .25) {
            double v = Balance::extraImpulse(y, 1000);
            QVERIFY(y + v * v / (2 * Balance::number("physics", "heldGravity")) <= std::max(Balance::number("physics", "airCap"), y) + .00001);
        }
        QVERIFY(Balance::jumpVelocity(100) <= std::sqrt(2 * Balance::number("physics", "heldGravity") * Balance::number("physics", "jumpCap")) + .00001);
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
            p.reward("run-one", 1, 300, 50, 3000, "gardener");
            auto before = p.data;
            p.reward("run-one", 1, 300, 50, 3000, "gardener");
            QCOMPARE(p.data, before);
            QCOMPARE(p.data["bestDistance"].toInt(), 3000);
            QCOMPARE(p.data["seeds"].toInt(), 3);
        }
        Progress p(path);
        auto before = p.data;
        p.reward("run-one", 1, 300, 50, 3000, "gardener");
        QCOMPARE(p.data, before);
        p.reward("another", 1, 300, 0, 3000, "gardener");
        QCOMPARE(p.data["seeds"].toInt(), 3);
    }
    void practiceRepeatsSelectedModelWithoutRewards() {
        QTemporaryDir dir;
        Backend b(fixture(dir, true), false);
        const auto profile = b.state()["profile"].toMap();
        for (const auto &entry : Balance::list("trainingModels")) {
            const auto model = entry.toMap();
            b.startPractice(model["id"].toString());
            QCOMPARE(b.state()["phase"].toString(), QString("running"));
            QVERIFY(b.state()["skills"].toMap().isEmpty());
            b.advance(.01);
            const auto obstacle = b.state()["obstacles"].toList().first().toMap();
            QCOMPARE(obstacle["type"].toString(), model["id"].toString());
            QCOMPARE(obstacle["sats"].toString(), model["sats"].toString());
            b.returnToCamp();
            QCOMPARE(b.state()["profile"].toMap(), profile);
        }
    }
    void buildingProgression() {
        QTemporaryDir dir;
        Progress p(fixture(dir));
        p.reward("first", 1, 1, 0, 499, "gardener");
        QVERIFY(!p.unlocked("wardrobe"));
        QVERIFY(!p.unlocked("forge"));
        p.reward("second", 1, 1, 0, 500, "gardener");
        QVERIFY(p.unlocked("wardrobe"));
        QVERIFY(!p.unlocked("forge"));
        p.data["coins"] = 100000;
        p.data["workshop"] = QVariantMap{{"strength", 9}, {"agility", 9}};
        QVERIFY(!p.unlocked("forge"));
        QVERIFY(p.buy("strength"));
        QVERIFY(p.unlocked("forge"));
        QCOMPARE(p.data["announcements"].toStringList().count("forge"), 1);
        Progress distance(dir.filePath("distance.json"));
        distance.reward("999", 1, 1, 0, 999, "gardener");
        QVERIFY(!distance.unlocked("forge"));
        distance.reward("1000", 1, 1, 0, 1000, "gardener");
        QVERIFY(distance.unlocked("forge"));
    }
    void distanceProgressionAccumulatesShortLiveRuns() {
        QTemporaryDir dir;
        Progress p(fixture(dir));
        QVERIFY(!p.unlocked("training"));
        QVERIFY(!p.buy("strength"));
        p.reward("short1", 1, 1, 10, 50, "gardener");
        QVERIFY(p.unlocked("training"));
        QVERIFY(p.unlocked("strength"));
        QVERIFY(!p.unlocked("agility"));
        for (int i = 0; i < 9; i++)
            p.reward(QString("short%1").arg(i + 2), 1, 1, 10, 50, "gardener");
        QCOMPARE(p.data["totalDistance"].toInt(), 500);
        QCOMPARE(p.data["bestDistance"].toInt(), 50);
        QVERIFY(!p.unlocked("forge"));
        QVERIFY(!p.unlocked("wardrobe"));
        QVERIFY(!p.unlocked("garden"));
        QVERIFY(!p.unlocked("diamond"));
        auto before = p.data;
        p.reward("training", 1, 1000, 10000, 10000, "gardener", "replay:2");
        QCOMPARE(p.data["totalDistance"], before["totalDistance"]);
        QVERIFY(!p.unlocked("garden"));
        p.reward("long", 1, 300, 100, 3000, "gardener");
        QVERIFY(p.unlocked("garden"));
        QVERIFY(p.unlocked("diamond"));
        const auto beforeRoleChange = p.data;
        QVERIFY(!p.changeClass("explorer"));
        QCOMPARE(p.data, beforeRoleChange);
        QCOMPARE(p.data["announcements"].toStringList().count("training"), 1);
    }
    void continuousForestStartsAtZeroAndKeepsTransactionDimensions() {
        QTemporaryDir dir;
        Backend b(fixture(dir), false);
        QVariantList rows;
        for (int i = 1; i < 200; i++)
            rows.append(tx(i, 0));
        b.acceptTransactions(rows);
        b.setTier(6);
        begin(b, false);
        QCOMPARE(b.state()["distance"].toDouble(), 0.);
        QCOMPARE(b.state()["regionIndex"].toInt(), 0);
        while (b.state()["distance"].toDouble() < 499)
            b.advance(.05);
        auto before = b.state()["obstacles"].toList();
        while (b.state()["distance"].toDouble() < 501)
            b.advance(.01);
        QCOMPARE(b.state()["phase"].toString(), QString("running"));
        QCOMPARE(b.state()["regionIndex"].toInt(), 1);
        for (auto v : before) {
            auto original = v.toMap();
            for (auto next : b.state()["obstacles"].toList()) {
                auto after = next.toMap();
                if (after["txid"] == original["txid"]) {
                    QCOMPARE(after["h"], original["h"]);
                    QCOMPARE(after["w"], original["w"]);
                }
            }
        }
        b.returnToCamp();
        begin(b, false);
        QCOMPARE(b.state()["distance"].toDouble(), 0.);
        QCOMPARE(b.state()["regionIndex"].toInt(), 0);
    }
    void oldSaveMigrationPreservesPurchasesAndAccess() {
        QTemporaryDir dir;
        auto path = fixture(dir, true);
        Progress p(path);
        p.data["schemaVersion"] = 3;
        p.data.remove("unlocked");
        p.data.remove("totalDistance");
        p.data.remove("bestDistance");
        p.data["milestones"] = QStringList{"T1:60", "T2:120", "T3:180"};
        p.save();
        Progress migrated(path);
        QVERIFY(migrated.error.isEmpty());
        QCOMPARE(migrated.data["schemaVersion"].toInt(), 5);
        QCOMPARE(migrated.data["coins"], p.data["coins"]);
        QCOMPARE(migrated.data["workshop"], p.data["workshop"]);
        QCOMPARE(migrated.data["owned"], p.data["owned"]);
        QCOMPARE(migrated.data["character"].toMap()["class"].toString(), QString("gardener"));
        QVERIFY(migrated.unlocked("garden"));
        QVERIFY(migrated.unlocked("diamond"));
        QVERIFY(migrated.data["recipes"].toStringList().contains("boots"));
        QVERIFY(migrated.unlocked("research3"));
        QVERIFY(QFile::exists(path + ".pre-v4"));
    }
    void rolesAreChosenAtCreationAndRemainFixed() {
        for (auto id : {"gardener", "explorer", "collector"}) {
            QTemporaryDir dir;
            Progress p(dir.filePath("role.json"));
            QVERIFY(p.create(character(id)));
            p.data["coins"] = 777;
            p.data["workshop"] = QVariantMap{{"strength", 7}};
            p.data["announcements"] = QStringList{"classes", "diamond"};
            QVERIFY(p.save());
            const auto before = p.data;
            QVERIFY(!p.changeClass("gardener"));
            QVERIFY(!p.create(character("collector")));
            QCOMPARE(p.data, before);
            Progress loaded(p.path);
            QCOMPARE(loaded.data["character"].toMap()["class"].toString(), QString(id));
            QCOMPARE(loaded.data["coins"].toInt(), 777);
            QCOMPARE(loaded.data["workshop"].toMap()["strength"].toInt(), 7);
            QVERIFY(!loaded.data["announcements"].toStringList().contains("classes"));
            QVERIFY(loaded.reset(true));
            QVERIFY(loaded.create(character("collector")));
            QCOMPARE(loaded.data["character"].toMap()["class"].toString(), QString("collector"));
        }
    }
    void languagePersistsIndependentlyOfCharacterReset() {
        QTemporaryDir dir;
        auto file = dir.filePath("language");
        Translator translator(file);
        QCOMPARE(translator.language(), QString("en"));
        translator.setLanguage("cs");
        QCOMPARE(translator.text("Base Camp"), QString::fromUtf8("Základní tábor"));
        QCOMPARE(translator.coins(1), QString::fromUtf8("1 mince"));
        QCOMPARE(translator.coins(2), QString::fromUtf8("2 mince"));
        QCOMPARE(translator.coins(5), QString::fromUtf8("5 mincí"));
        auto exact = translator.integer("2100000000000001");
        exact.remove(QChar(0xa0));
        exact.remove(' ');
        QCOMPARE(exact, QString("2100000000000001"));
        Progress p(fixture(dir));
        p.reset(true);
        Translator loaded(file);
        QCOMPARE(loaded.language(), QString("cs"));
        loaded.setLanguage("en");
        QCOMPARE(loaded.text("Base Camp"), QString("Base Camp"));
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
        begin(b, false, "shield");
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
        begin(b, true, "jetpack");
        b.spawn = 1e9;
        b.fly(true);
        for (int i = 0; i < 800; i++) {
            if (i % 30 == 0)
                b.jump();
            b.advance(.005);
            QVERIFY(b.state()["y"].toDouble() <= b.state()["stats"].toMap()["airCap"].toDouble() + .05);
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
    void nativeMenusLanguagesAndScaledMouseCoordinates() {
        QTemporaryDir dir;
        Backend b(fixture(dir, true), false);
        Theme theme(dir.path());
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
        window->requestActivate();
        auto viewport = itemNamed(window->contentItem(), "viewport");
        QVERIFY(viewport);
        for (auto size : {QSize(1280, 720), QSize(1366, 768), QSize(1920, 1080), QSize(640, 520)}) {
            window->resize(size);
            QTest::qWait(30);
            QVERIFY(viewport->scale() > .85);
            auto point = viewport->mapToScene(QPointF(540, 215));
            QTest::mouseClick(window, Qt::LeftButton, Qt::NoModifier, point.toPoint());
            for (int i = 0; i < 180; i++)
                b.advance(.05);
            QVERIFY(std::abs(b.state()["campX"].toDouble() - 540) < 3);
            QVERIFY(std::abs(b.state()["campY"].toDouble() - 215) < 3);
        }
        b.walkTo(465, 290);
        for (int i = 0; i < 180; i++)
            b.advance(.05);
        QTest::keyClick(window, Qt::Key_E);
        QTest::qWait(30);
        QCOMPARE(b.state()["station"].toString(), QString("training"));
        auto focus = window->activeFocusItem();
        QVERIFY(focus);
        auto levels = b.state()["profile"].toMap()["workshop"];
        // The maxed strength button is disabled: focus skips it to the training action.
        QCOMPARE(focus->objectName(), QString("campTraining"));
        QTest::keyClick(window, Qt::Key_S);
        QVERIFY(window->activeFocusItem() != focus);
        QTest::keyClick(window, Qt::Key_W);
        QCOMPARE(window->activeFocusItem(), focus);
        QTest::keyClick(window, Qt::Key_Right);
        QVERIFY(window->activeFocusItem() != focus);
        QTest::keyClick(window, Qt::Key_Left);
        QVERIFY(window->activeFocusItem());
        QCOMPARE(b.state()["profile"].toMap()["workshop"], levels);
        QTest::keyClick(window, Qt::Key_Escape);
        QCOMPARE(b.state()["station"].toString(), QString());
        QTest::keyClick(window, Qt::Key_F10);
        QTest::qWait(30);
        QCOMPARE(window->property("settingsOpen").toBool(), true);
        QTest::keyClick(window, Qt::Key_S);
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(translator.language(), QString("cs"));
        QCOMPARE(itemNamed(window->contentItem(), "settings")->property("text").toString(),
                 QString::fromUtf8("Nastavení"));
        QTest::keyClick(window, Qt::Key_Up);
        QTest::keyClick(window, Qt::Key_E);
        QCOMPARE(translator.language(), QString("en"));
        QTest::keyClick(window, Qt::Key_Escape);
        QCOMPARE(window->property("settingsOpen").toBool(), false);
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
        QVariantList pathRows;
        for (int i = 1; i <= 40; i++)
            pathRows.append(tx(i, 0));
        b.acceptTransactions(pathRows);
        b.walkTo(540, 215);
        for (int i = 0; i < 200; i++)
            b.advance(.05);
        QTest::keyPress(window, Qt::Key_E);
        QCOMPARE(b.state()["phase"].toString(), "select");
        QTest::qWait(30);
        QKeyEvent repeated(QEvent::KeyPress, Qt::Key_E, Qt::NoModifier, "e", true, 1);
        QCoreApplication::sendEvent(window, &repeated);
        QCOMPARE(b.state()["phase"].toString(), "select");
        QTest::keyRelease(window, Qt::Key_E);
        auto skill0 = itemNamed(window->contentItem(), "skill0");
        QVERIFY(skill0);
        QCOMPARE(window->activeFocusItem(), skill0);
        QTest::keyClick(window, Qt::Key_S);
        QVERIFY(window->activeFocusItem() != skill0);
        QTest::keyClick(window, Qt::Key_Up);
        QCOMPARE(window->activeFocusItem(), skill0);
        QTest::keyClick(window, Qt::Key_E);
        QTest::qWait(30);
        QCOMPARE(b.state()["phase"].toString(), "running");
        QTest::keyPress(window, Qt::Key_Space);
        QTest::qWait(100);
        QTest::keyRelease(window, Qt::Key_Space);
        QVERIFY(b.state()["y"].toDouble() > 0);
        QTest::keyClick(window, Qt::Key_P);
        QCOMPARE(b.state()["phase"].toString(), "paused");
        QTest::qWait(30);
        QTest::keyClick(window, Qt::Key_E); // Focused Continue on the pause screen.
        QCOMPARE(b.state()["phase"].toString(), QString("running"));
        for (int i = 0; i < 1600 && b.state()["distance"].toDouble() < 501; i++)
            b.advance(.05);
        QCOMPARE(b.state()["regionIndex"].toInt(), 1);
        b.acceptTransactions({tx(999, 2000000000000000ULL)});
        for (int i = 0; i < 4000 && b.state()["phase"] == "running"; i++)
            b.advance(.05);
        QCOMPARE(b.state()["phase"].toString(), QString("over"));
        QTest::qWait(30);
        QTest::keyClick(window, Qt::Key_E); // Focused Next run.
        QCOMPARE(b.state()["phase"].toString(), QString("select"));
        QCOMPARE(b.state()["distance"].toDouble(), 0.);
        QTest::keyClick(window, Qt::Key_Escape);
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
