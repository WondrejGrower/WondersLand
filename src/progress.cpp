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
    } else if (old["schemaVersion"].toInt() == 3) {
        data = old;
    } else
        error = "Unsupported save version. File preserved.";
}
QVariantMap Progress::fresh() const {
    return {{"schemaVersion", 3},
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
    ch["hairStyle"] = std::clamp(ch["hairStyle"].toInt(), 0, 3);
    if (data.contains("legacyCoins") && QFile::exists(path) && !QFile::exists(path + ".pre-v3")) {
        if (!QFile::copy(path, path + ".pre-v3")) {
            error = "Cannot back up old progress. Migration cancelled.";
            return false;
        }
    }
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
bool Progress::hasMilestone(int tier, int seconds) const {
    return data["milestones"].toStringList().contains(QString("T%1:%2").arg(tier).arg(seconds));
}
bool Progress::buy(const QString &branch) {
    const auto previous = data;
    if (data["runs"].toInt() < 1 || Balance::find("workshop", branch).isEmpty())
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
    if (data["runs"].toInt() < 1 || item.isEmpty() || data["owned"].toStringList().contains(id))
        return false;
    auto recipe = item["recipe"].toString();
    if (!recipe.isEmpty()) {
        auto match = QRegularExpression("^T([1-6]):([0-9]+)$").match(recipe);
        if (!match.hasMatch() || !hasMilestone(match.captured(1).toInt(), match.captured(2).toInt()))
            return false;
    }
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
    if (!data["owned"].toStringList().contains(id))
        return false;
    data[id] = !data[id].toBool();
    return commit(previous);
}
bool Progress::research(const QString &id, qint64 now) {
    const auto previous = data;
    updateResearch(now);
    auto project = Balance::find("research", id);
    if (project.isEmpty() || !hasMilestone(1, 60) || data["completed"].toStringList().contains(id))
        return false;
    auto jobs = data["research"].toList();
    int slotCount = 1 + int(hasMilestone(2, 120)) + int(hasMilestone(3, 180));
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
    auto milestones = data["milestones"].toStringList();
    for (auto v : Balance::list("milestones")) {
        auto m = v.toMap();
        auto key = QString("T%1:%2").arg(tier).arg(m["seconds"].toInt());
        if (seconds >= m["seconds"].toInt() && !milestones.contains(key)) {
            milestones.append(key);
            data["coins"] = data["coins"].toInt() + m["coins"].toInt();
            data["seeds"] = data["seeds"].toInt() + m["seeds"].toInt();
        }
    }
    data["milestones"] = milestones;
    int threshold = Balance::list("tiers")[tier - 1].toMap()["unlock"].toInt();
    if (threshold > 0 && seconds >= threshold)
        data["tier"] = std::max(data["tier"].toInt(), std::min(6, tier + 1));
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
    out["researchSlots"] =
        hasMilestone(1, 60) ? 1 + int(hasMilestone(2, 120)) + int(hasMilestone(3, 180)) : 0;
    return out;
}

bool Progress::commit(const QVariantMap &previous) {
    if (save())
        return true;
    data = previous;
    return false;
}
