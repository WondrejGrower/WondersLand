#include "backend.h"
#include <QDateTime>
#include <QDesktopServices>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QRegularExpression>
#include <QSaveFile>
#include <QStandardPaths>
#include <algorithm>
#include <cmath>
Backend::Backend(QString path, bool network, QObject *parent) : QObject(parent) {
    networkEnabled = network;
    savePath = path.isEmpty()
                   ? QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + "/progress.json"
                   : path;
    QFile f(savePath);
    if (f.open(QIODevice::ReadOnly)) {
        auto o = QJsonDocument::fromJson(f.readAll()).object();
        best = std::max(0, o["best"].toInt());
        wallet = std::max(0, o["coins"].toInt());
    }
    clock.setInterval(16);
    elapsed.start();
    connect(&clock, &QTimer::timeout, this, [this] {
        double dt = std::min(.05, elapsed.restart() / 1000.);
        advance(dt);
    });
    clock.start();
    if (network) {
        poll.setInterval(15000);
        connect(&poll, &QTimer::timeout, this, &Backend::refresh);
        poll.start();
        refresh();
    }
}
QVariantMap Backend::plant(qulonglong sats) {
    QString type;
    double h, w;
    if (QString::number(sats).startsWith("420")) {
        type = "cannabis";
        h = sats > 100000000 ? 110 : 43;
        w = 30;
    } else if (sats < 100000) {
        type = "flower";
        h = 15;
        w = 14;
    } else if (sats < 350000) {
        type = "tulip";
        h = 22;
        w = 16;
    } else if (sats < 800000) {
        type = "rose";
        h = 28;
        w = 20;
    } else if (sats < 1000000) {
        type = "fern";
        h = 32;
        w = 24;
    } else if (sats < 100000000) {
        type = "birch";
        h = 54;
        w = 27;
    } else if (sats < 1000000000) {
        type = "pine";
        h = 82;
        w = 38;
    } else if (sats < 100000000000ULL) {
        type = "oak";
        h = 110;
        w = 50;
    } else {
        type = "sequoia";
        h = 148;
        w = 54;
    }
    return {{"type", type}, {"h", h}, {"w", w}, {"sats", QString::number(sats)}};
}
QVariantMap Backend::state() const {
    return {{"phase", phase},
            {"source", source},
            {"updated", updated},
            {"poolSize", pool.size()},
            {"demo", demoMode},
            {"y", y},
            {"distance", distance},
            {"score", score},
            {"best", best},
            {"wallet", wallet},
            {"collected", collected},
            {"obstacles", obstacles},
            {"coins", coins},
            {"hit", hit},
            {"animation", animation},
            {"campX", campX},
            {"campY", campY},
            {"station", station},
            {"nearby", nearbyStation()},
            {"moving", !movement.isEmpty() || walkingTo}};
}
void Backend::acceptTransactions(const QVariantList &rows) {
    for (auto value : rows) {
        auto row = value.toMap();
        QString txid = row["txid"].toString();
        bool ok = false;
        auto sats = row["value"].toULongLong(&ok);
        if (!ok || !QRegularExpression("^[a-f0-9]{64}$").match(txid).hasMatch())
            continue;
        bool known = false;
        for (auto old : pool)
            if (old.toMap()["txid"] == txid) {
                known = true;
                break;
            }
        if (!known) {
            auto p = plant(sats);
            p["txid"] = txid;
            p["fee"] = row["fee"];
            p["status"] = "observed";
            pool.prepend(p);
        }
    }
    while (pool.size() > 256)
        pool.removeLast();
    emit changed();
}
void Backend::refresh() {
    if (inFlight || !networkEnabled)
        return;
    inFlight = true;
    QNetworkRequest request(QUrl("https://mempool.space/api/mempool/recent"));
    request.setTransferTimeout(10000);
    auto reply = net.get(request);
    connect(reply, &QNetworkReply::finished, this, [this, reply] {
        inFlight = false;
        QJsonParseError error;
        auto doc = QJsonDocument::fromJson(reply->readAll(), &error);
        if (reply->error() == QNetworkReply::NoError && error.error == QJsonParseError::NoError &&
            doc.isArray() && !doc.array().isEmpty()) {
            acceptTransactions(doc.array().toVariantList());
            source = "live";
            updated = QDateTime::currentSecsSinceEpoch();
        } else
            source = "offline";
        reply->deleteLater();
        emit changed();
    });
}
void Backend::start(bool demo) {
    if (!demo && pool.isEmpty())
        return;
    stopMovement();
    station.clear();
    demoMode = demo;
    runPool = pool;
    if (demo) {
        runPool.clear();
        for (qulonglong sats : {50000ULL, 250000ULL, 600000ULL, 900000ULL, 10000000ULL, 500000000ULL,
                                42000000ULL, 2000000000ULL, 120000000000ULL}) {
            auto p = plant(sats);
            p["txid"] = "";
            p["status"] = "demo";
            runPool.append(p);
        }
    }
    phase = "running";
    y = velocity = distance = spawn = 0;
    score = collected = index = 0;
    held = false;
    hit.clear();
    obstacles.clear();
    coins.clear();
    elapsed.restart();
    emit changed();
}
void Backend::jump() {
    if (phase == "running" && y <= .01) {
        velocity = 285;
        held = true;
    }
}
void Backend::releaseJump() { held = false; }
void Backend::pause() {
    if (phase == "running")
        phase = "paused";
    else if (phase == "paused") {
        phase = "running";
        elapsed.restart();
    }
    emit changed();
}
void Backend::spawnPlant() {
    // A run freezes its starting snapshot. New transactions enter the next run,
    // so obstacles never change size under the player's feet.
    auto p = runPool[index++ % runPool.size()].toMap();
    p["x"] = 680.;
    obstacles.append(p);
    coins.append(QVariantMap{{"x", 730.}, {"y", 45. + (index % 3) * 14}});
    spawn = 2.3 + (index % 4) * .2;
}
void Backend::advance(double dt) {
    dt = std::clamp(dt, 0., .05);
    if (phase == "camp") {
        advanceCamp(dt);
        return;
    }
    if (phase != "running")
        return;
    animation += dt;
    double speed = 105 + std::min(80., distance * .012);
    distance += speed * dt / 10.;
    score = int(distance);
    spawn -= dt;
    if (spawn <= 0)
        spawnPlant();
    velocity -= (held && velocity > 0 ? 570 : 850) * dt;
    y = std::max(0., y + velocity * dt);
    if (y == 0)
        velocity = 0;
    for (auto &v : obstacles) {
        auto p = v.toMap();
        p["x"] = p["x"].toDouble() - speed * dt;
        v = p;
    }
    for (auto &v : coins) {
        auto c = v.toMap();
        double x = c["x"].toDouble() - speed * dt;
        c["x"] = x;
        if (std::abs(x - 108) < 17 && std::abs(c["y"].toDouble() - (y + 16)) < 23 && !c["taken"].toBool()) {
            c["taken"] = true;
            ++collected;
        }
        v = c;
    }
    for (auto v : obstacles) {
        auto p = v.toMap();
        double x = p["x"].toDouble(), w = p["w"].toDouble();
        // Hitbox is slightly smaller than the character and botanical canopy.
        if (x + w - 5 > 100 && x + 5 < 115 && y + 3 < p["h"].toDouble() - 4) {
            end(p);
            break;
        }
    }
    while (!obstacles.isEmpty() && obstacles.first().toMap()["x"].toDouble() < -80)
        obstacles.removeFirst();
    while (!coins.isEmpty() && coins.first().toMap()["x"].toDouble() < -40)
        coins.removeFirst();
    emit changed();
}
void Backend::end(const QVariantMap &p) {
    phase = "over";
    hit = p;
    bankRun();
    if (demoMode || !networkEnabled)
        return;
    QString id = hit["txid"].toString();
    QNetworkRequest request(QUrl("https://mempool.space/api/tx/" + id + "/status"));
    request.setTransferTimeout(8000);
    auto reply = net.get(request);
    connect(reply, &QNetworkReply::finished, this, [this, reply, id] {
        if (phase == "over" && hit["txid"].toString() == id && reply->error() == QNetworkReply::NoError) {
            auto o = QJsonDocument::fromJson(reply->readAll()).object();
            if (o.contains("confirmed"))
                hit["status"] = o["confirmed"].toBool() ? "confirmed" : "pending";
        }
        reply->deleteLater();
        emit changed();
    });
}
void Backend::save() {
    QDir().mkpath(QFileInfo(savePath).absolutePath());
    QSaveFile f(savePath);
    if (f.open(QIODevice::WriteOnly)) {
        f.write(QJsonDocument(QJsonObject{{"best", best}, {"coins", wallet}}).toJson());
        if (!f.commit())
            source = "save-error";
    } else
        source = "save-error";
}
void Backend::openTransaction() {
    QString id = hit["txid"].toString();
    if (!demoMode && QRegularExpression("^[a-f0-9]{64}$").match(id).hasMatch())
        QDesktopServices::openUrl(QUrl("https://mempool.space/tx/" + id));
}

void Backend::bankRun() {
    // Practice rewards never enter persistent progression or live records.
    if (!demoMode) {
        best = std::max(best, score);
        wallet += collected;
        save();
    }
}
void Backend::returnToCamp() {
    if (phase == "running" || phase == "paused")
        bankRun();
    phase = "camp";
    stopMovement();
    station.clear();
    hit.clear();
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
    for (auto spot : spots)
        if (std::hypot(campX - spot.x, campY - spot.y) < 43)
            return spot.id;
    return {};
}
void Backend::interact() {
    if (phase != "camp")
        return;
    if (station == "portal") {
        start(false);
        return;
    }
    if (station == "training") {
        start(true);
        return;
    }
    if (!station.isEmpty()) {
        closeStation();
        return;
    }
    station = nearbyStation();
    stopMovement();
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
