#include "progress.h"
#include "balance.h"
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QRegularExpression>
#include <QSaveFile>
#include <algorithm>
Progress::Progress(QString file) : path(file) {
    data = fresh();
    QFile f(path);
    if (!f.exists())
        return;
    if (!f.open(QIODevice::ReadOnly)) {
        error = "Cannot read saved progress";
        return;
    }
    QJsonParseError parse;
    auto doc = QJsonDocument::fromJson(f.readAll(), &parse);
    if (parse.error != QJsonParseError::NoError || !doc.isObject()) {
        error = "Saved progress is damaged. It was not overwritten. Reset requires confirmation.";
        return;
    }
    auto old = doc.toVariant().toMap();
    if (!old.contains("schemaVersion")) {
        data["legacyCoins"] = std::max(0, old["coins"].toInt());
        data["legacyBest"] = old["best"];
    } else if (old["schemaVersion"].toInt() == 3 || old["schemaVersion"].toInt() == 4 || old["schemaVersion"].toInt() == 5) {
        data = old;
        if (old["schemaVersion"].toInt() == 3) {
            if (!QFile::exists(path + ".pre-v4") && !QFile::copy(path, path + ".pre-v4")) {
                error = "Cannot back up old progress. Migration cancelled.";
                return;
            }
            int best = 0;
            auto records = old["records"].toMap();
            for (auto it = records.cbegin(); it != records.cend(); ++it)
                if (it.key().contains(":live:"))
                    best = std::max(best, it.value().toInt());
            QStringList milestones;
            for (auto key : old["milestones"].toStringList()) {
                int seconds = key.section(':', 1).toInt();
                best = std::max(best, int(seconds * 10.5));
            }
            for (auto v : Balance::list("milestones"))
                if (best >= v.toMap()["meters"].toInt())
                    milestones.append("distance:" + v.toMap()["meters"].toString());
            data["milestones"] = milestones;
            data["recipes"] =
                old["milestones"].toStringList().contains("T2:120") ? QStringList{"boots"} : QStringList{};
            data["bestDistance"] = best;
            data["totalDistance"] = best; // Historical totals were not recorded; keep a lower bound.
            QStringList preserved;
            if (!old["character"].toMap().isEmpty()) {
                preserved << "classes"; // Every old character could already choose these classes.
                if (old["runs"].toInt() > 0)
                    preserved << "training" << "strength" << "agility" << "magnet" << "luck"
                              << "yield" << "flying" << "forge" << "wardrobe";
                if (old["milestones"].toStringList().contains("T1:60") ||
                    !old["completed"].toStringList().isEmpty() || !old["research"].toList().isEmpty())
                    preserved << "garden";
                if (old["milestones"].toStringList().contains("T2:120") ||
                    old["owned"].toStringList().contains("boots") ||
                    old["completed"].toStringList().contains("air"))
                    preserved << "diamond" << "research2";
                if (old["milestones"].toStringList().contains("T3:180"))
                    preserved << "research3";
                auto levels = old["workshop"].toMap();
                for (auto it = levels.cbegin(); it != levels.cend(); ++it)
                    if (it.value().toInt() > 0)
                        preserved << "training" << it.key();
                if (!old["owned"].toStringList().isEmpty())
                    preserved << "forge" << "wardrobe";
            }
            preserved.removeDuplicates();
            data["unlocked"] = preserved;
            data["announcements"] = QStringList{};
            data["schemaVersion"] = 4;
            updateUnlocks(false);
            save();
        }
    } else
        error = "Unsupported save version. File preserved.";
    if (error.isEmpty() && data["schemaVersion"].toInt() < 5) {
        if (QFile::exists(path) && !QFile::exists(path + ".pre-v5") && !QFile::copy(path, path + ".pre-v5")) {
            error = "Cannot back up old progress. Migration cancelled.";
            return;
        }
        data["schemaVersion"] = 5;
        data["inventory"] = QStringList{};
        data["equipment"] = QVariantMap{};
        if (!data["character"].toMap().isEmpty()) {
            auto equipment = starterOutfit({});
            QStringList inventory;
            for (const auto &id : equipment) if (!id.toString().isEmpty()) inventory.append(id.toString());
            data["equipment"] = equipment;
            data["inventory"] = inventory;
        }
        save();
    }
    if (error.isEmpty()) {
        auto queue = data["announcements"].toStringList();
        if (queue.removeAll("classes") > 0) {
            data["announcements"] = queue;
            save();
        }
    }
}
QVariantMap Progress::fresh() const {
    return {{"schemaVersion", 5},
            {"inventory", QStringList{}},
            {"equipment", QVariantMap{}},
            {"bestDistance", 0},
            {"totalDistance", 0},
            {"unlocked", QStringList{}},
            {"announcements", QStringList{}},
            {"character", QVariantMap{}},
            {"coins", 0},
            {"seeds", 0},
            {"tier", 1},
            {"workshop", QVariantMap{}},
            {"completed", QStringList{}},
            {"research", QVariantList{}},
            {"milestones", QStringList{}},
            {"owned", QStringList{}},
            {"hands", false},
            {"boots", false},
            {"paidRuns", QStringList{}},
            {"records", QVariantMap{}},
            {"runs", 0},
            {"lastClock", 0},
            {"excluded", ""}};
}
bool Progress::save() {
    if (!error.isEmpty() && error != "Cannot save progress")
        return false;
    error.clear();
    QDir().mkpath(QFileInfo(path).absolutePath());
    QSaveFile f(path);
    if (!f.open(QIODevice::WriteOnly)) {
        error = "Cannot save progress";
        return false;
    }
    f.write(QJsonDocument::fromVariant(data).toJson());
    if (!f.commit()) {
        error = "Cannot save progress";
        return false;
    }
    return true;
}
bool Progress::create(const QVariantMap &c) {
    const auto previous = data;
    if (!error.isEmpty() || !data["character"].toMap().isEmpty())
        return false;
    auto ch = c;
    auto name = ch["name"].toString().trimmed().left(24);
    if (name.isEmpty() || Balance::find("classes", ch["class"].toString()).isEmpty())
        return false;
    ch["name"] = name;
    for (auto key : {"hair", "skin", "shirt"}) {
        auto color = ch[key].toString();
        if (!color.startsWith('#') || color.size() != 7)
            return false;
    }
    ch["hairStyle"] = std::clamp(ch["hairStyle"].toInt(), 0, 15);
    if (data.contains("legacyCoins") && QFile::exists(path) && !QFile::exists(path + ".pre-v3")) {
        if (!QFile::copy(path, path + ".pre-v3")) {
            error = "Cannot back up old progress. Migration cancelled.";
            return false;
        }
    }
    const auto equipment = starterOutfit(ch.take("starterEquipment").toMap());
    QStringList inventory;
    for (const auto &id : equipment) if (!id.toString().isEmpty()) inventory.append(id.toString());
    data["equipment"] = equipment;
    data["inventory"] = inventory;
    data["character"] = ch;
    data["coins"] = data["coins"].toInt() + data.take("legacyCoins").toInt();
    return commit(previous);
}
bool Progress::reset(bool confirmed) {
    if (!confirmed)
        return false;
    data = fresh();
    error.clear();
    return save();
}
QStringList Progress::unlocks() const {
    auto result = data["unlocked"].toStringList();
    for (auto v : Balance::list("progression")) {
        auto rule = v.toMap();
        if (data["runs"].toInt() >= rule["runs"].toInt() &&
            data["totalDistance"].toDouble() >= rule["total"].toDouble() &&
            data["bestDistance"].toDouble() >= rule["best"].toDouble())
            if (!result.contains(rule["id"].toString()))
                result.append(rule["id"].toString());
    }
    return result;
}
bool Progress::unlocked(const QString &id) const { return unlocks().contains(id); }
void Progress::updateUnlocks(bool announce) {
    auto previous = data["unlocked"].toStringList();
    auto current = unlocks();
    auto queue = data["announcements"].toStringList();
    if (announce)
        for (auto id : current)
            if (!previous.contains(id))
                queue.append(id);
    data["unlocked"] = current;
    data["announcements"] = queue;
}
bool Progress::changeClass(const QString &id) {
    Q_UNUSED(id);
    // Keep the old API inert: roles are chosen once during character creation.
    return false;
}
bool Progress::buy(const QString &branch) {
    const auto previous = data;
    if (!unlocked(branch) || Balance::find("workshop", branch).isEmpty())
        return false;
    auto levels = data["workshop"].toMap();
    int level = levels[branch].toInt(), cost = Balance::price(branch, level);
    if (cost < 0 || data["coins"].toInt() < cost)
        return false;
    levels[branch] = level + 1;
    data["workshop"] = levels;
    data["coins"] = data["coins"].toInt() - cost;
    return commit(previous);
}
bool Progress::craft(const QString &id) {
    const auto previous = data;
    auto item = Balance::find("items", id);
    if (!unlocked(item["feature"].toString()) || item.isEmpty() || data["owned"].toStringList().contains(id))
        return false;
    auto recipe = item["recipe"].toString();
    if (!recipe.isEmpty() && !data["recipes"].toStringList().contains(id) &&
        data["bestDistance"].toInt() < recipe.section(':', 1).toInt())
        return false;
    int cost = item["cost"].toInt();
    if (data["coins"].toInt() < cost)
        return false;
    auto owned = data["owned"].toStringList();
    owned.append(id);
    data["owned"] = owned;
    data["coins"] = data["coins"].toInt() - cost;
    return commit(previous);
}
bool Progress::equip(const QString &id) {
    const auto previous = data;
    if (Balance::find("items", id).isEmpty() || !data["owned"].toStringList().contains(id))
        return false;
    data[id] = !data[id].toBool();
    return commit(previous);
}
bool Progress::research(const QString &id, qint64 now) {
    const auto previous = data;
    updateResearch(now);
    auto project = Balance::find("research", id);
    if (project.isEmpty() || !unlocked("garden") || data["completed"].toStringList().contains(id))
        return false;
    auto jobs = data["research"].toList();
    int slotCount = 1 + int(unlocked("research2")) + int(unlocked("research3"));
    for (auto j : jobs)
        if (j.toMap()["id"] == id)
            return false;
    if (jobs.size() >= slotCount || data["coins"].toInt() < project["cost"].toInt() ||
        data["seeds"].toInt() < project["seeds"].toInt())
        return false;
    data["coins"] = data["coins"].toInt() - project["cost"].toInt();
    data["seeds"] = data["seeds"].toInt() - project["seeds"].toInt();
    now = std::max(now, data["lastClock"].toLongLong());
    jobs.append(QVariantMap{{"id", id}, {"started", now}, {"end", now + project["seconds"].toLongLong()}});
    data["research"] = jobs;
    return commit(previous);
}
void Progress::updateResearch(qint64 now) {
    if (now < 0 || now > 4102444800LL)
        return;
    now = std::max(now, data["lastClock"].toLongLong());
    data["lastClock"] = now;
    auto jobs = data["research"].toList(), remaining = QVariantList{};
    auto completed = data["completed"].toStringList();
    bool changed = false;
    for (auto v : jobs) {
        auto j = v.toMap();
        auto spec = Balance::find("research", j["id"].toString());
        qint64 start = j["started"].toLongLong(), end = j["end"].toLongLong();
        if (spec.isEmpty() || start < 0 || end < start || end - start != spec["seconds"].toLongLong()) {
            error = "Invalid research timer. Save preserved.";
            return;
        }
        if (now >= end) {
            if (!completed.contains(j["id"].toString()))
                completed.append(j["id"].toString());
            changed = true;
        } else
            remaining.append(j);
    }
    data["research"] = remaining;
    data["completed"] = completed;
    if (changed)
        save();
}
void Progress::reward(const QString &run, int tier, double seconds, int coins, int score,
                      const QString &classId, const QString &mode) {
    auto paid = data["paidRuns"].toStringList();
    if (paid.contains(run) || run.isEmpty())
        return;
    paid.append(run);
    while (paid.size() > 128)
        paid.removeFirst();
    data["paidRuns"] = paid;
    if (mode != "live") {
        auto records = data["records"].toMap();
        QString key = Balance::version() + ":" + mode + QString(":T%1:").arg(tier) + classId;
        records[key] = std::max(records[key].toInt(), score);
        data["records"] = records;
        data["activeRun"] = QVariantMap{};
        save();
        return;
    }

    data["coins"] = data["coins"].toInt() + coins;
    data["runs"] = data["runs"].toInt() + 1;
    Q_UNUSED(seconds);
    data["bestDistance"] = std::max(data["bestDistance"].toInt(), score);
    data["totalDistance"] = data["totalDistance"].toDouble() + std::max(0, score);
    auto milestones = data["milestones"].toStringList();
    for (auto v : Balance::list("milestones")) {
        auto m = v.toMap();
        auto key = "distance:" + m["meters"].toString();
        if (score >= m["meters"].toInt() && !milestones.contains(key)) {
            milestones.append(key);
            data["coins"] = data["coins"].toInt() + m["coins"].toInt();
            data["seeds"] = data["seeds"].toInt() + m["seeds"].toInt();
        }
    }
    data["milestones"] = milestones;
    updateUnlocks();
    auto records = data["records"].toMap();
    QString key = Balance::version() + QString(":live:T%1:").arg(tier) + classId;
    records[key] = std::max(records[key].toInt(), score);
    data["records"] = records;
    data["activeRun"] = QVariantMap{};
    save();
}
QVariantMap Progress::view() const {
    auto out = data;
    out["error"] = error;
    auto levels = data["workshop"].toMap();
    QVariantList branches;
    for (auto v : Balance::list("workshop")) {
        auto b = v.toMap();
        auto id = b["id"].toString();
        int lv = levels[id].toInt();
        b["level"] = lv;
        b["price"] = Balance::price(id, lv);
        b["bonus"] = Balance::bonus(id, lv);
        b["nextBonus"] = Balance::bonus(id, std::min(50, lv + 1));
        branches.append(b);
    }
    out["branches"] = branches;
    out["unlocked"] = unlocks();
    out["researchSlots"] =
        unlocked("garden") ? 1 + int(unlocked("research2")) + int(unlocked("research3")) : 0;
    return out;
}

bool Progress::commit(const QVariantMap &previous) {
    if (save())
        return true;
    data = previous;
    return false;
}

QVariantMap Progress::starterOutfit(const QVariantMap &selected) {
    auto result = Balance::config()["starterEquipment"].toObject().toVariantMap();
    for (auto it = result.begin(); it != result.end(); ++it) {
        const auto id = selected.contains(it.key()) ? selected[it.key()].toString() : it.value().toString();
        const auto item = Balance::find("clothing", id);
        it.value() = item["slot"].toString() == it.key() ? QVariant(id) : QVariant();
    }
    return result;
}
bool Progress::takeClothing(const QString &id) {
    const auto previous = data;
    auto inventory = data["inventory"].toStringList();
    if (data["character"].toMap().isEmpty() || Balance::find("clothing", id).isEmpty() || inventory.contains(id)) return false;
    inventory.append(id); data["inventory"] = inventory;
    return commit(previous);
}
bool Progress::equipClothing(const QString &id) {
    const auto previous = data;
    const auto item = Balance::find("clothing", id);
    if (item.isEmpty() || !data["inventory"].toStringList().contains(id)) return false;
    auto equipment = data["equipment"].toMap();
    const auto slot = item["slot"].toString();
    equipment[slot] = equipment[slot].toString() == id ? QVariant() : QVariant(id);
    data["equipment"] = equipment;
    return commit(previous);
}
