#include "backend.h"
#include "balance.h"
#include <QClipboard>
#include <QJSEngine>
#include <QFile>
#include <QDateTime>
#include <QDesktopServices>
#include <QDir>
#include <QFileInfo>
#include <QGuiApplication>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QRegularExpression>
#include <QSaveFile>
#include <QSignalBlocker>
#include <QStandardPaths>
#include <QUuid>
#include <algorithm>
#include <cmath>
static QVariantMap plantVisual(QJSEngine &engine, const QVariantMap &p, const QString &fixture) {
    if (!engine.globalObject().property("descriptor").isCallable()) {
        QFile file(":/PlantVisual.js");
        if (!file.open(QIODevice::ReadOnly)) qFatal("Missing PlantVisual.js");
        QString source = QString::fromUtf8(file.readAll());
        source.remove(".pragma library");
        if (engine.evaluate(source).isError()) qFatal("Invalid PlantVisual.js");
    }
    return engine.globalObject().property("descriptor").call({
        p["type"].toString(), p["sats"].toString(), p["h"].toDouble(),
        p["txid"].toString(), fixture}).toVariant().toMap();
}
static QString saveLocation(QString p) {
    return p.isEmpty()
               ? QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + "/progress.json"
               : p;
}
Backend::Backend(QString path, bool network, QObject *parent)
    : QObject(parent), progress(saveLocation(path)), networkEnabled(network) {
    progress.updateResearch(QDateTime::currentSecsSinceEpoch());
    auto abandoned = progress.data["activeRun"].toMap();
    if (!abandoned.isEmpty())
        progress.reward(abandoned["id"].toString(), abandoned["tier"].toInt(),
                        abandoned["seconds"].toDouble(), abandoned["coins"].toInt(),
                        abandoned["score"].toInt(), abandoned["class"].toString(),
                        abandoned.value("mode", "live").toString());
    phase = progress.data["character"].toMap().isEmpty() ? "creation" : "camp";
    clock.setInterval(16);
    elapsed.start();
    connect(&clock, &QTimer::timeout, this, [this] { advance(std::min(.25, elapsed.restart() / 1000.)); });
    clock.start();
    if (network) {
        poll.setInterval(15000);
        connect(&poll, &QTimer::timeout, this, &Backend::refresh);
        poll.start();
        refresh();
    }
}
QVariantMap Backend::plant(qulonglong sats, int tier) {
    double h = Balance::height(sats, tier);
    return {{"btc", QString::number(sats / 100000000) + "." +
                        QString::number(sats % 100000000).rightJustified(8, '0')},
            {"type", Balance::species(sats)},
            {"h", h},
            {"w", Balance::width(h)},
            {"sats", QString::number(sats)}};
}
QVariantMap Backend::state() const {
    auto profile = progress.view();
    int best = 0;
    auto records = profile["records"].toMap();
    for (auto v : records)
        best = std::max(best, v.toInt());
    QVariantList hud;
    for (auto v : Balance::list("skills")) {
        auto m = v.toMap();
        int rank = skills.value(m["id"].toString());
        if (rank > 0) {
            m["rank"] = rank;
            hud.append(m);
        }
    }
    while (hud.size() < 6)
        hud.append(QVariantMap{{"name", "—"}, {"rank", 0}});
    auto regions = Balance::list("regions");
    int regionIndex = 0;
    for (int i = 1; i < regions.size(); ++i)
        if (distance >= regions[i].toMap()["meters"].toDouble())
            regionIndex = i;
    auto announcements = profile["announcements"].toStringList();
    QString announcement;
    if (!announcements.isEmpty())
        announcement = Balance::find("progression", announcements.first())["name"].toString();
    return {{"region", regions[regionIndex]},
            {"regionIndex", regionIndex},
            {"announcement", announcement},
            {"config", Balance::config().toVariantMap()},
            {"phase", phase},
            {"newMilestones", newMilestones},
            {"landing", landing},
            {"source", source},
            {"updated", updated},
            {"poolSize",
             (phase == "camp" || phase == "over" || phase == "select") ? feed.recent().size() : feed.size()},
            {"demo", demoMode},
            {"practiceModel", practiceModel},
            {"replay", replayMode},
            {"y", y},
            {"velocity", velocity},
            {"distance", distance},
            {"score", score},
            {"best", best},
            {"wallet", profile["coins"]},
            {"collected", collected},
            {"earned", int(earnedMilli / 1000)},
            {"obstacles", obstacles},
            {"coins", coins},
            {"hit", hit},
            {"animation", animation},
            {"facingLeft", movement.contains("left") || (walkingTo && targetX < campX)}, {"campX", campX},
            {"campY", campY},
            {"station", station},
            {"nearby", nearbyStation()},
            {"moving", !movement.isEmpty() || walkingTo},
            {"profile", profile},
            {"stats", stats()},
            {"tier", tier},
            {"time", activeTime},
            {"countdown", countdown},
            {"choices", choices},
            {"skillHud", hud},
            {"flying", flying},
            {"fuel", fuel},
            {"rescues", rescues},
            {"rescuesGranted", rescuesGranted},
            {"invulnerable", invulnerable},
            {"notice", notice},
            {"balanceVersion", Balance::version()},
            {"seed", seed},
            {"traceSize", trace.size()}};
}
void Backend::createCharacter(const QString &name, const QString &classId, const QString &hair,
                              const QString &skin, const QString &shirt, int style, const QVariantMap &outfit) {
    cachedStats.clear();
    if (progress.create({{"name", name},
                         {"class", classId},
                         {"hair", hair},
                         {"skin", skin},
                         {"shirt", shirt},
                         {"hairStyle", style}, {"starterEquipment", outfit}})) {
        phase = "camp";
        notice = "Character created";
    }
    emit changed();
}
void Backend::resetCharacter(bool confirmed) {
    cachedStats.clear();
    if (confirmed && progress.reset(true)) {
        phase = "creation";
        runId.clear();
        paid = true;
        skills.clear();
        obstacles.clear();
        coins.clear();
        station.clear();
        stopMovement();
    }
    emit changed();
}
void Backend::setTier(int t) {
    Q_UNUSED(t);
    tier = 1;
}
void Backend::changeAppearance(const QString &part) {
    if (phase != "camp")
        return;
    auto previous = progress.data;
    auto c = progress.data["character"].toMap();
    if (part == "hairStyle")
        c[part] = (c[part].toInt() + 1) % 16;
    else {
        QStringList colors = part == "hair"
                                 ? QStringList{"#5e3936", "#d6b96d", "#bcc4c5", "#302f43", "#a65c50"}
                             : part == "skin"  ? QStringList{"#dfaf87", "#b97e5f", "#82533f", "#f0cbb2"}
                             : part == "shirt" ? QStringList{"#679e86", "#9278aa", "#c18b65", "#638ba9"}
                                               : QStringList{};
        if (colors.isEmpty())
            return;
        c[part] = colors[(colors.indexOf(c[part].toString()) + 1) % colors.size()];
    }
    progress.data["character"] = c;
    if (!progress.save())
        progress.data = previous;
    emit changed();
}
void Backend::changeClass(const QString &id) {
    if (phase != "camp")
        return;
    if (progress.changeClass(id))
        cachedStats.clear();
    emit changed();
}
void Backend::dismissAnnouncement() {
    if (phase != "camp")
        return;
    auto queue = progress.data["announcements"].toStringList();
    if (!queue.isEmpty())
        queue.removeFirst();
    progress.data["announcements"] = queue;
    progress.save();
    emit changed();
}
void Backend::acceptTransactions(const QVariantList &rows) {
    QVariantList observed;
    for (auto v : rows) {
        auto row = v.toMap();
        if (!row.contains("observedAt"))
            row["observedAt"] = QDateTime::currentSecsSinceEpoch();
        observed.append(row);
    }
    feed.receive(observed);
    if (phase == "connecting" && !feed.recent().isEmpty()) {
        start(false);
        return;
    }
    if (phase == "waiting" && feed.size() > 0 && feed.usedCount() < 10000) {
        phase = "countdown";
        countdown = 3;
    }
    emit changed();
}
void Backend::refresh() {
    if (!networkEnabled || inFlight || replayMode)
        return;
    inFlight = true;
    QNetworkRequest req(QUrl("https://mempool.space/api/mempool/recent"));
    req.setTransferTimeout(10000);
    auto reply = net.get(req);
    connect(reply, &QNetworkReply::finished, this, [this, reply] {
        inFlight = false;
        QJsonParseError error;
        auto doc = QJsonDocument::fromJson(reply->readAll(), &error);
        if (reply->error() == QNetworkReply::NoError && error.error == QJsonParseError::NoError &&
            doc.isArray()) {
            source = "live";
            updated = QDateTime::currentSecsSinceEpoch();
            acceptTransactions(doc.array().toVariantList());
        } else
            source = "offline";
        reply->deleteLater();
        emit changed();
    });
}
double Backend::effect(const QString &id) const {
    int rank = skills.value(id);
    if (rank <= 0)
        return 0;
    return Balance::find("skills", id)["effects"].toList().value(rank - 1).toDouble();
}
QVariantMap Backend::stats() const {
    if (!cachedStats.isEmpty())
        return cachedStats;
    auto ch = progress.data["character"].toMap();
    auto cls = Balance::find("classes", ch["class"].toString());
    auto levels = progress.data["workshop"].toMap();
    double bonus = cls["jump"].toDouble() + Balance::bonus("strength", levels["strength"].toInt()) +
                   effect("leap") +
                   (progress.data["boots"].toBool() ? Balance::find("items", "boots")["jump"].toDouble() : 0);
    double magnet =
        1 + cls["magnet"].toDouble() + Balance::bonus("magnet", levels["magnet"].toInt()) + effect("magnet") +
        (progress.data["hands"].toBool() ? Balance::find("items", "hands")["magnet"].toDouble() : 0);
    const double permanentBonus = bonus - effect("leap");
    const double permanentVelocity = Balance::jumpVelocity(permanentBonus);
    const double airCap = std::min(Balance::number("physics", "airCap"),
        permanentVelocity * permanentVelocity / (2 * Balance::number("physics", "heldGravity")) *
        Balance::number("physics", "airHeightFactor"));
    cachedStats = {
        {"jumpVelocity", Balance::jumpVelocity(bonus)},
        {"airCap", airCap},
        {"magnet",
         Balance::number("physics", "magnet") * std::min(Balance::number("physics", "magnetCap"), magnet)},
        {"buffer", Balance::number("physics", "buffer")},
        {"timeScale", 1 - Balance::bonus("agility", levels["agility"].toInt())},
        {"economy", std::min(Balance::number("run", "maxEconomyBonus"),
                             cls["coins"].toDouble() + Balance::bonus("yield", levels["yield"].toInt()))},
        {"luck", Balance::bonus("luck", levels["luck"].toInt())},
        {"class", ch["class"]}};
    return cachedStats;
}
QVariantList Backend::availableSkills(bool forRun) const {
    QVariantList result;
    auto completed = progress.data["completed"].toStringList();
    for (auto v : Balance::list("skills")) {
        auto m = v.toMap();
        auto id = m["id"].toString();
        if (m["unlock"] != "base" && !completed.contains(m["unlock"].toString()))
            continue;
        if (id == "jetpack" && !progress.unlocked("diamond"))
            continue;
        if (id == progress.data["excluded"].toString())
            continue;
        int rank = skills.value(id);
        if (forRun && (rank >= m["maxRank"].toInt() ||
                       (rank == 0 && skills.size() >= int(Balance::number("run", "maxSkills"))) ||
                       (id == "shield" && rescuesGranted >= int(Balance::number("physics", "rescueCap")))))
            continue;
        result.append(m);
    }
    return result;
}
QVariantList Backend::offers(int count, bool synergy) {
    auto candidates = availableSkills();
    QVariantList out;
    if (synergy) {
        QVariantList filtered;
        for (auto v : candidates) {
            auto m = v.toMap();
            for (auto it = skills.begin(); it != skills.end(); ++it) {
                auto ownedTags = Balance::find("skills", it.key())["tags"].toStringList();
                bool shared = false;
                for (auto tag : m["tags"].toStringList())
                    if (ownedTags.contains(tag))
                        shared = true;
                if (shared) {
                    filtered.append(v);
                    break;
                }
            }
        }
        if (!filtered.isEmpty())
            candidates = filtered;
    }
    while (!candidates.isEmpty() && out.size() < count) {
        int pick = skillRng.bounded(candidates.size());
        auto offer = candidates.takeAt(pick).toMap();
        int roll = skillRng.bounded(10000);
        double luck = stats()["luck"].toDouble() * 100;
        auto weights = Balance::config()["rarityWeights"].toArray();
        double common = weights[0].toDouble() - luck;
        double rareBoundary = common + weights[1].toDouble() + luck * .8;
        QString rarity = roll < common * 100 ? "common" : roll < rareBoundary * 100 ? "rare" : "epic";
        int gain = Balance::config()["rarityEffects"].toObject()[rarity].toInt();
        int rank = skills.value(offer["id"].toString());
        offer["rarity"] = rarity;
        offer["gain"] = std::min(gain, offer["maxRank"].toInt() - rank);
        offer["nextRank"] = rank + offer["gain"].toInt();
        out.append(offer);
    }
    if (out.isEmpty())
        out.append(QVariantMap{{"id", "coins"}, {"name", "Coin cache"}, {"rarity", "common"}, {"gain", 5}});
    return out;
}
void Backend::grantRescue() {
    if (rescuesGranted < int(Balance::number("physics", "rescueCap"))) {
        rescues++;
        rescuesGranted++;
    }
}
void Backend::applySkill(const QVariantMap &offer) {
    auto id = offer["id"].toString();
    if (id == "coins") {
        int amount = int(Balance::number("run", "fallbackCoins"));
        collected += amount;
        earnedMilli += 1000 * amount * (1 + stats()["economy"].toDouble());
        return;
    }
    int next =
        std::min(Balance::find("skills", id)["maxRank"].toInt(), skills.value(id) + offer["gain"].toInt());
    if (id == "shield" && skills.value(id) == 0)
        grantRescue();
    skills[id] = next;
    cachedStats.clear();
    notice = offer["name"].toString();
    recordEvent(QVariantMap{{"event", "skill"}, {"time", activeTime}, {"id", id}, {"rank", next}});
}
QVariantMap Backend::previewPlant(const QString &sats) const {
    const auto value = sats.toULongLong();
    const auto h = Balance::height(value, 1);
    return {{"h", h}, {"w", Balance::width(h)}, {"type", Balance::species(value)}};
}
void Backend::startPractice(const QString &model) {
    if (model != "all" && Balance::find("trainingModels", model).isEmpty())
        return;
    start(true);
    if (!demoMode || phase != "select")
        return;
    practiceModel = model;
    choices.clear();
    runStarted = true;
    phase = "running";
    elapsed.restart();
    emit changed();
}
void Backend::start(bool demo) {
    cachedStats.clear();
    if (progress.data["character"].toMap().isEmpty() || !progress.error.isEmpty())
        return;
    if (!demo && feed.recent().isEmpty()) {
        settle();
        stopMovement();
        station.clear();
        phase = "connecting";
        notice.clear();
        emit changed();
        return;
    }
    settle();
    stopMovement();
    station.clear();
    tier = 1;
    demoMode = demo;
    practiceModel.clear();
    runId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    paid = false;
    runStarted = false;
    seed = replayMode ? replaySeed : QRandomGenerator::global()->generate();
    feed.begin(seed);
    skillRng.seed(seed ^ 0x937a142b);
    skills.clear();
    newMilestones.clear();
    trace.clear();
    obstacles.clear();
    coins.clear();
    hit.clear();
    flying.clear();
    y = velocity = distance = spawn = animation = activeTime = earnedMilli = checkpoint = invulnerable =
        inputBuffer = 0;
    score = collected = index = rescues = rescuesGranted = pickups = 0;
    nextUpgrade = 30;
    fuel = 3;
    glide = 0;
    airJumpUsed = emergencyUsed = held = jetHeld = false;
    for (auto value : Balance::list("sets")) {
        auto set = value.toMap();
        bool equipped = true;
        for (auto item : set["requires"].toStringList())
            if (!progress.data[item].toBool())
                equipped = false;
        if (equipped)
            for (int i = 0; i < set["rescues"].toInt(); i++)
                grantRescue();
    }
    choices = offers(3);
    phase = "select";
    emit changed();
}
void Backend::chooseSkill(int choice) {
    if (phase != "select" || choice < 0 || choice >= choices.size())
        return;
    applySkill(choices[choice].toMap());
    runStarted = true;
    phase = "running";
    elapsed.restart();
    saveCheckpoint();
    emit changed();
}
void Backend::buy(const QString &id) {
    cachedStats.clear();
    if (phase == "camp") {
        notice = progress.buy(id) ? "Upgrade purchased" : "Upgrade unavailable or insufficient coins";
        emit changed();
    }
}
void Backend::craft(const QString &id) {
    if (phase == "camp") {
        notice = progress.craft(id) ? "Item crafted" : "Recipe locked, already owned or insufficient coins";
        emit changed();
    }
}
void Backend::equip(const QString &id) {
    cachedStats.clear();
    if (phase == "camp") {
        progress.equip(id);
        emit changed();
    }
}
void Backend::research(const QString &id) {
    if (phase == "camp") {
        notice = progress.research(id, QDateTime::currentSecsSinceEpoch())
                     ? "Research started"
                     : "Research unavailable or insufficient resources";
        emit changed();
    }
}
void Backend::excludeSkill(const QString &id) {
    if (phase != "camp" || !progress.data["completed"].toStringList().contains("stable"))
        return;
    auto old = progress.data["excluded"];
    progress.data["excluded"] = "";
    auto available = availableSkills(false);
    bool found = false;
    for (auto v : available)
        if (v.toMap()["id"] == id)
            found = true;
    if (id.isEmpty() || (found && available.size() > 3)) {
        progress.data["excluded"] = id;
        progress.save();
    } else
        progress.data["excluded"] = old;
    emit changed();
}
void Backend::jump() {
    if (phase == "running")
        recordEvent({{"event", "jump"}, {"time", activeTime}});
    if (phase != "running")
        return;
    held = true;
    if (y <= .01) {
        velocity = stats()["jumpVelocity"].toDouble();
        airJumpUsed = false;
        glide = effect("glider");
    } else if (!airJumpUsed &&
               (skills.value("double") > 0 || (stats()["class"] == "explorer" && !emergencyUsed))) {
        double fraction = skills.value("double") ? effect("double") : .65;
        velocity = Balance::extraImpulse(y, velocity, fraction, stats()["airCap"].toDouble());
        airJumpUsed = true;
        if (!skills.value("double"))
            emergencyUsed = true;
    } else
        inputBuffer = stats()["buffer"].toDouble();
}
void Backend::releaseJump() {
    if (held && phase == "running")
        recordEvent({{"event", "release"}, {"time", activeTime}});
    held = false;
    if (phase == "running" && velocity > Balance::number("physics", "tapVelocity"))
        velocity = Balance::number("physics", "tapVelocity");
}
void Backend::fly(bool enabled) {
    if (enabled != jetHeld && phase == "running")
        recordEvent({{"event", "jetpack"}, {"time", activeTime}, {"held", enabled}});
    jetHeld = enabled;
}
void Backend::pause() {
    if (phase == "paused") {
        phase = resumePhase;
        if (phase == "waiting" && feed.size() > 0 && feed.usedCount() < 10000) {
            phase = "countdown";
            countdown = 3;
        }
        elapsed.restart();
    } else if (phase == "running" || phase == "waiting" || phase == "countdown") {
        resumePhase = phase;
        phase = "paused";
        held = jetHeld = false;
    }
    emit changed();
}
void Backend::setActive(bool enabled) {
    active = enabled;
    if (!active) {
        stopMovement();
        if (phase == "running" || phase == "countdown")
            pause();
    }
    elapsed.restart();
}
void Backend::spawnPlant() {
    QVariantMap row;
    QString fixture;
    if (demoMode) {
        const auto models = Balance::list("trainingModels");
        const auto model = !practiceModel.isEmpty() && practiceModel != "all"
                               ? Balance::find("trainingModels", practiceModel)
                               : models[index % models.size()].toMap();
        fixture = model["id"].toString();
        row = {{"txid", ""}, {"value", model["sats"]}};
    } else
        row = feed.take();
    if (row.isEmpty())
        return;
    auto p = plant(row["value"].toULongLong(), tier);
    p["txid"] = row["txid"];
    p["visual"] = plantVisual(visualEngine, p, fixture);
    p["status"] = demoMode ? "demo" : "observed";
    p["observedAt"] = row["observedAt"];
    p["x"] = 680.;
    p["instance"] = index++;
    p["resolved"] = false;
    obstacles.append(p);
    recordEvent(QVariantMap{{"event", "transaction"}, {"time", activeTime}, {"plant", p}});
    for (int i = 0; i < 2; i++)
        coins.append(QVariantMap{{"x", 720. + i * 20}, {"y", 28. + (index % 3) * 12}, {"taken", false}});
    auto spaces = Balance::config()["physics"].toObject()["spacing"].toArray();
    spawn = spaces[(index - 1) % spaces.size()].toDouble();
}
void Backend::advance(double dt) {
    if (previewFrozen)
        return;
    // Fixed upper integration step keeps trajectories consistent across 30–144 Hz.
    if (!std::isfinite(dt) || dt <= 0)
        return;
    if (dt > 1. / 120. + 1e-9) {
        int parts = int(std::ceil(std::min(dt, .25) * 120));
        QSignalBlocker blocker(this);
        for (int i = 0; i < parts; i++)
            advance(std::min(dt, .25) / parts);
        blocker.unblock();
        emit changed();
        return;
    }

    qint64 now = QDateTime::currentSecsSinceEpoch();
    if (now != lastResearch) {
        auto before = progress.data["completed"];
        progress.updateResearch(now);
        if (before != progress.data["completed"])
            notice = "Research completed";
        lastResearch = now;
        emit changed();
    }
    if (!active)
        return;
    dt = std::clamp(dt, 0., .05);
    if (phase == "camp") {
        advanceCamp(dt);
        return;
    }
    if (phase == "countdown") {
        countdown -= dt;
        if (countdown <= 0)
            phase = "running";
        emit changed();
        return;
    }
    if (phase != "running")
        return;
    if (!demoMode && spawn <= 0 && (feed.size() == 0 || feed.usedCount() >= 10000) && obstacles.isEmpty()) {
        phase = "waiting";
        held = jetHeld = false;
        emit changed();
        return;
    }
    dt *= stats()["timeScale"].toDouble();
    activeTime += dt;
    animation += dt;
    invulnerable = std::max(0., invulnerable - dt);
    inputBuffer = std::max(0., inputBuffer - dt);
    double speed = Balance::number("physics", "speed") *
                   std::min(Balance::number("physics", "maxSpeedFactor"), 1 + activeTime / 1200);
    distance += speed * dt / 10;
    score = int(distance);
    spawn -= dt;
    if (spawn <= 0)
        spawnPlant();
    if (y <= .01 && inputBuffer > 0) {
        inputBuffer = 0;
        bool stillHeld = held;
        jump();
        held = stillHeld;
    }
    double gravity = held && velocity > 0 ? Balance::number("physics", "heldGravity")
                                          : Balance::number("physics", "gravity");
    if (held && velocity < 0 && glide > 0) {
        gravity = Balance::number("physics", "gliderGravity");
        glide = std::max(0., glide - dt);
    }
    if (jetHeld && skills.value("jetpack") > 0 && fuel > 0) {
        fuel = std::max(0., fuel - dt);
        velocity = std::min(velocity + Balance::number("physics", "jetAcceleration") * dt,
                            Balance::extraImpulse(y, velocity, 1, stats()["airCap"].toDouble()));
        gravity = Balance::number("physics", "heldGravity");
    }
    double oldY = y;
    landing = std::max(0., landing - dt);
    velocity -= gravity * dt;
    y = std::max(0., y + velocity * dt);
    if (y == 0) {
        if (oldY > 0)
            landing = .15;
        velocity = 0;
        airJumpUsed = false;
        glide = effect("glider");
    }
    for (auto &v : obstacles) {
        auto p = v.toMap();
        p["x"] = p["x"].toDouble() - speed * dt;
        v = p;
    }
    for (auto &v : coins) {
        auto c = v.toMap();
        double x = c["x"].toDouble() - speed * dt;
        c["x"] = x;
        double radius = stats()["magnet"].toDouble();
        if (!c["taken"].toBool() && std::hypot(x - 108, c["y"].toDouble() - (y + 18)) < radius) {
            c["taken"] = true;
            collected++;
            double bonus = stats()["economy"].toDouble() + (y > 3 ? effect("aircoins") : 0);
            earnedMilli += 1000 * (1 + std::min(Balance::number("run", "maxEconomyBonus"), bonus));
        }
        v = c;
    }
    if (practiceModel.isEmpty() && progress.unlocked("flying") && activeTime >= nextUpgrade && flying.isEmpty()) {
        auto offer = offers(1, (pickups + 1) % 3 == 0).first().toMap();
        offer["age"] = -2.;
        offer["x"] = 600.;
        offer["y"] = 35.;
        flying = offer;
        nextUpgrade += Balance::number("run", "upgradeEvery");
    }
    if (!flying.isEmpty()) {
        double age = flying["age"].toDouble() + dt;
        double window = Balance::number("run", "upgradeWindow") + (stats()["class"] == "collector" ? 1 : 0);
        flying["age"] = age;
        flying["x"] = age < 0 ? 132 + (0 - age) * 234 : 132 - 48 * age / window;
        bool blocked = false;
        for (auto v : obstacles) {
            auto p = v.toMap();
            if (p["x"].toDouble() < 155 && p["x"].toDouble() + p["w"].toDouble() > 80 &&
                p["h"].toDouble() > 35)
                blocked = true;
        }
        flying["blocked"] = blocked;
        if (blocked && age >= 0)
            flying["age"] = -.05;
        if (age >= 0 && !blocked && std::hypot(flying["x"].toDouble() - 108, 35 - (y + 18)) < 25) {
            applySkill(flying);
            pickups++;
            flying.clear();
        } else if (age > window)
            flying.clear();
    }
    for (auto &v : obstacles) {
        auto p = v.toMap();
        double x = p["x"].toDouble();
        if (!p["resolved"].toBool() && x + p["w"].toDouble() - 3 > 100 && x + 3 < 115 &&
            y + 2 < p["h"].toDouble() - 2) {
            if (invulnerable > 0)
                continue;
            if (rescues > 0) {
                rescues--;
                p["resolved"] = true;
                v = p;
                invulnerable = 2;
                notice = "Rescue used";
                trace.append(
                    QVariantMap{{"event", "rescue"}, {"instance", p["instance"]}, {"time", activeTime}});
            } else {
                end(p);
                break;
            }
        }
    }
    while (!obstacles.isEmpty() && obstacles.first().toMap()["x"].toDouble() < -110)
        obstacles.removeFirst();
    while (!coins.isEmpty() && coins.first().toMap()["x"].toDouble() < -40)
        coins.removeFirst();
    if (activeTime - checkpoint >= Balance::number("run", "checkpointEvery")) {
        saveCheckpoint();
        checkpoint = activeTime;
    }
    emit changed();
}
void Backend::saveCheckpoint() {
    if (demoMode || paid || runId.isEmpty())
        return;
    progress.data["activeRun"] =
        QVariantMap{{"id", runId},
                    {"tier", tier},
                    {"seconds", activeTime},
                    {"coins", int(earnedMilli / 1000)},
                    {"score", score},
                    {"class", stats()["class"]},
                    {"mode", replayMode ? "replay:" + QString::number(seed) : "live"}};
    progress.save();
}
void Backend::settle() {
    if (runId.isEmpty() || paid)
        return;
    paid = true;
    if (!runStarted)
        return;
    if (!demoMode) {
        auto previousMilestones = progress.data["milestones"].toStringList();
        progress.reward(runId, tier, activeTime, int(earnedMilli / 1000), score, stats()["class"].toString(),
                        replayMode ? "replay:" + QString::number(seed) : "live");
        for (auto m : progress.data["milestones"].toStringList())
            if (!previousMilestones.contains(m))
                newMilestones.append(m);
        QSaveFile f(QFileInfo(progress.path).absolutePath() + "/last-trace.json");
        if (f.open(QIODevice::WriteOnly)) {
            f.write(QJsonDocument::fromVariant(
                        QVariantMap{{"source", replayMode ? "recorded dataset" : "mempool.space recent"},
                                    {"capturedAt", updated},
                                    {"result", QVariantMap{{"seconds", activeTime},
                                                           {"distance", distance},
                                                           {"coins", int(earnedMilli / 1000)},
                                                           {"rescuesUsed", rescuesGranted - rescues}}},
                                    {"balanceVersion", Balance::version()},
                                    {"tier", tier},
                                    {"class", stats()["class"]},
                                    {"seed", seed},
                                    {"build", progress.data["workshop"]},
                                    {"hands", progress.data["hands"]},
                                    {"boots", progress.data["boots"]},
                                    {"events", trace}})
                        .toJson());
            f.commit();
        }
    }
}
void Backend::end(const QVariantMap &p) {
    phase = "over";
    hit = p;
    settle();
    if (demoMode || !networkEnabled)
        return;
    hit["status"] = "checking";
    QString id = hit["txid"].toString();
    QNetworkRequest req(QUrl("https://mempool.space/api/tx/" + id + "/status"));
    req.setTransferTimeout(8000);
    auto reply = net.get(req);
    connect(reply, &QNetworkReply::finished, this, [this, id, reply] {
        if (phase == "over" && hit["txid"] == id) {
            hit["status"] = "observed";
            if (reply->error() == QNetworkReply::NoError) {
                auto o = QJsonDocument::fromJson(reply->readAll()).object();
                if (o.contains("confirmed"))
                    hit["status"] = o["confirmed"].toBool() ? "confirmed" : "pending";
            }
        }
        reply->deleteLater();
        emit changed();
    });
}
void Backend::openTransaction() {
    auto id = hit["txid"].toString();
    if (!demoMode && QRegularExpression("^[a-f0-9]{64}$").match(id).hasMatch())
        QDesktopServices::openUrl(QUrl("https://mempool.space/tx/" + id));
}
void Backend::copyTransaction() {
    if (!demoMode)
        QGuiApplication::clipboard()->setText(hit["txid"].toString());
}
void Backend::returnToCamp() {
    settle();
    if (phase == "creation")
        return;
    phase = "camp";
    station.clear();
    stopMovement();
    elapsed.restart();
    emit changed();
}
void Backend::setMovement(const QString &direction, bool down) {
    if (phase != "camp" || !station.isEmpty())
        return;
    if (!QStringList{"left", "right", "up", "down"}.contains(direction))
        return;
    walkingTo = false;
    if (down)
        movement.insert(direction);
    else
        movement.remove(direction);
}
void Backend::stopMovement() {
    movement.clear();
    walkingTo = false;
}
void Backend::walkTo(double x, double y) {
    if (phase != "camp" || !station.isEmpty() || !std::isfinite(x) || !std::isfinite(y))
        return;
    movement.clear();
    targetX = std::clamp(x, 35., 605.);
    targetY = std::clamp(y, 175., 320.);
    walkingTo = true;
}
QString Backend::nearbyStation() const {
    struct Spot {
        const char *id;
        double x, y;
    };
    const Spot spots[] = {{"home", 270, 190},  {"portal", 540, 215},   {"training", 465, 290},
                          {"forge", 112, 225}, {"wardrobe", 390, 195}, {"library", 175, 300}};
    for (auto spot : spots) {
        QString feature = QString(spot.id) == "library" ? "garden" : QString(spot.id);
        if (feature != "home" && feature != "portal" && !progress.unlocked(feature))
            continue;
        if (std::hypot(campX - spot.x, campY - spot.y) < 43)
            return spot.id;
    }
    return {};
}
void Backend::interact() {
    if (phase != "camp")
        return;
    if (!station.isEmpty())
        return;
    auto nearby = nearbyStation();
    stopMovement();
    if (nearby == "portal") {
        start(false);
        return;
    }
    station = nearby;
    emit changed();
}
void Backend::closeStation() {
    station.clear();
    stopMovement();
    emit changed();
}
void Backend::advanceCamp(double dt) {
    animation += dt;
    if (station.isEmpty()) {
        double dx = movement.contains("right") - movement.contains("left");
        double dy = movement.contains("down") - movement.contains("up");
        if (walkingTo) {
            dx = targetX - campX;
            dy = targetY - campY;
            if (std::hypot(dx, dy) < 2) {
                walkingTo = false;
                campX = targetX;
                campY = targetY;
                dx = dy = 0;
            }
        }
        double length = std::hypot(dx, dy);
        if (length > 0) {
            double speed = std::min(92. * dt, walkingTo ? length : 92. * dt);
            campX = std::clamp(campX + dx / length * speed, 35., 605.);
            campY = std::clamp(campY + dy / length * speed, 175., 320.);
        }
    }
    emit changed();
}

void Backend::previewScene() {
    // Isolated CLI preview only: labelled training artwork, never a live feed.
    if (!demoMode)
        return;
    obstacles.clear();
    const qulonglong values[] = {100000, 1000000, 10000000, 1000000000, 42000000000ULL, 1000000000000ULL};
    for (int i = 0; i < 6; i++) {
        auto p = plant(values[i]);
        p["txid"] = "";
        p["status"] = "demo";
        p["x"] = 210 + i * 75;
        p["resolved"] = false;
        obstacles.append(p);
    }
    emit changed();
}

void Backend::setReplay(const QVariantList &rows, quint32 fixedSeed) {
    replayMode = true;
    replaySeed = fixedSeed;
    poll.stop();
    feed = TransactionQueue();
    feed.receive(rows);
    source = "replay";
    emit changed();
}

void Backend::recordEvent(QVariantMap event) {
    if (trace.size() >= 20000) {
        int discard = -1;
        for (int i = 0; i < trace.size(); i++)
            if (trace[i].toMap()["event"] != "transaction") {
                discard = i;
                break;
            }
        if (discard < 0)
            return;
        trace.removeAt(discard);
    }
    trace.append(event);
}

void Backend::openInventory() {
    if (phase != "camp") return;
    stopMovement(); station = "inventory"; emit changed();
}
void Backend::takeClothing(const QString &id) {
    if (phase != "camp") return;
    progress.takeClothing(id); emit changed();
}
void Backend::equipClothing(const QString &id) {
    if (phase != "camp") return;
    progress.equipClothing(id); emit changed();
}
