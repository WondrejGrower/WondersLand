#pragma once
#include <QVariantList>
#include <QVariantMap>
class Progress {
  public:
    explicit Progress(QString path);
    QVariantMap data;
    QString error, path;
    bool save();
    bool create(const QVariantMap &character);
    bool reset(bool confirmed);
    bool buy(const QString &branch);
    bool craft(const QString &item);
    bool equip(const QString &item);
    bool research(const QString &id, qint64 now);
    void updateResearch(qint64 now);
    bool unlocked(const QString &id) const;
    QStringList unlocks() const;
    void updateUnlocks(bool announce = true);
    bool changeClass(const QString &id);
    void reward(const QString &runId, int tier, double seconds, int coins, int score, const QString &classId,
                const QString &mode = "live");
    QVariantMap view() const;

  private:
    QVariantMap fresh() const;
    bool commit(const QVariantMap &previous);
};
