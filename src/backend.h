#pragma once
#include "progress.h"
#include "transactionfeed.h"
#include <QElapsedTimer>
#include <QJSEngine>
#include <QNetworkAccessManager>
#include <QObject>
#include <QRandomGenerator>
#include <QSet>
#include <QTimer>
class Backend : public QObject {
    Q_OBJECT
    Q_PROPERTY(QVariantMap state READ state NOTIFY changed)
  public:
    explicit Backend(QString saveFile = {}, bool network = true, QObject *parent = nullptr);
    QVariantMap state() const;
    Q_INVOKABLE void createCharacter(const QString &name, const QString &classId, const QString &hair,
                                     const QString &skin, const QString &shirt, int style, const QVariantMap &outfit = {});
    Q_INVOKABLE void resetCharacter(bool confirmed);
    Q_INVOKABLE void setTier(int tier); // Compatibility only: every expedition starts at the forest edge.
    Q_INVOKABLE void changeAppearance(const QString &part);
    Q_INVOKABLE void changeClass(const QString &id);
    Q_INVOKABLE void dismissAnnouncement();
    Q_INVOKABLE void start(bool demo = false);
    Q_INVOKABLE QVariantMap previewPlant(const QString &sats) const;
    Q_INVOKABLE void startPractice(const QString &model = "all");
    Q_INVOKABLE void chooseSkill(int choice);
    Q_INVOKABLE void buy(const QString &branch);
    Q_INVOKABLE void craft(const QString &item);
    Q_INVOKABLE void equip(const QString &item);
    Q_INVOKABLE void openInventory();
    Q_INVOKABLE void takeClothing(const QString &id);
    Q_INVOKABLE void equipClothing(const QString &id);
    Q_INVOKABLE void research(const QString &id);
    Q_INVOKABLE void excludeSkill(const QString &id);
    Q_INVOKABLE void jump();
    Q_INVOKABLE void releaseJump();
    Q_INVOKABLE void fly(bool enabled);
    Q_INVOKABLE void pause();
    Q_INVOKABLE void setActive(bool active);
    Q_INVOKABLE void refresh();
    Q_INVOKABLE void openTransaction();
    Q_INVOKABLE void copyTransaction();
    Q_INVOKABLE void returnToCamp();
    Q_INVOKABLE void settle();
    Q_INVOKABLE void setMovement(const QString &direction, bool down);
    Q_INVOKABLE void stopMovement();
    Q_INVOKABLE void walkTo(double x, double y);
    Q_INVOKABLE void interact();
    Q_INVOKABLE void closeStation();
    void advance(double dt);
    void previewScene();
    void freezePreview() { previewFrozen = true; }
    void setReplay(const QVariantList &rows, quint32 fixedSeed);
    void acceptTransactions(const QVariantList &rows);
    static QVariantMap plant(qulonglong sats, int tier = 1);

  private:
    QJSEngine visualEngine; // Destroy before the application and Qt global JS caches.
    mutable QVariantMap cachedStats;
    Progress progress;
    TransactionQueue feed;
    QNetworkAccessManager net;
    QTimer clock, poll;
    QElapsedTimer elapsed;
    QString phase, source = "waiting", station, runId, resumePhase = "running", notice;
    QStringList newMilestones;
    QVariantList obstacles, coins, choices, trace;
    QVariantMap hit, flying;
    QMap<QString, int> skills;
    QRandomGenerator skillRng{1};
    QSet<QString> movement;
    bool runStarted = false;
    bool previewFrozen = false;
    bool replayMode = false;
    quint32 replaySeed = 0;
    bool networkEnabled, active = true, inFlight = false, demoMode = false, held = false, jetHeld = false,
                         airJumpUsed = false, emergencyUsed = false, paid = false;
    QString practiceModel;
    int tier = 1, index = 0, score = 0, collected = 0, rescues = 0, rescuesGranted = 0, pickups = 0;
    quint32 seed = 0;
    qint64 updated = 0, lastResearch = 0;
    double y = 0, velocity = 0, distance = 0, spawn = 0, animation = 0, activeTime = 0, nextUpgrade = 30,
           invulnerable = 0, fuel = 3, glide = 0, inputBuffer = 0, countdown = 3, earnedMilli = 0,
           checkpoint = 0;
    double landing = 0;
    double campX = 320, campY = 235, targetX = 320, targetY = 235;
    bool walkingTo = false;
    QString nearbyStation() const;
    void advanceCamp(double dt);
    void spawnPlant();
    void end(const QVariantMap &obstacle);
    QVariantMap stats() const;
    double effect(const QString &id) const;
    QVariantList availableSkills(bool forRun = true) const;
    QVariantList offers(int count, bool synergy = false);
    void applySkill(const QVariantMap &offer);
    void grantRescue();
    void saveCheckpoint();
    void recordEvent(QVariantMap event);
  signals:
    void changed();
};
