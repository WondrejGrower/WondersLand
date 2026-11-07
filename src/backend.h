#pragma once
#include <QElapsedTimer>
#include <QNetworkAccessManager>
#include <QObject>
#include <QSet>
#include <QTimer>
#include <QVariantList>
#include <QVariantMap>
class Backend : public QObject {
    Q_OBJECT
    Q_PROPERTY(QVariantMap state READ state NOTIFY changed)
  public:
    explicit Backend(QString saveFile = {}, bool network = true, QObject *parent = nullptr);
    QVariantMap state() const;
    Q_INVOKABLE void start(bool demo = false);
    Q_INVOKABLE void jump();
    Q_INVOKABLE void releaseJump();
    Q_INVOKABLE void pause();
    Q_INVOKABLE void refresh();
    Q_INVOKABLE void openTransaction();
    Q_INVOKABLE void returnToCamp();
    Q_INVOKABLE void setMovement(const QString &direction, bool down);
    Q_INVOKABLE void stopMovement();
    Q_INVOKABLE void walkTo(double x, double y);
    Q_INVOKABLE void interact();
    Q_INVOKABLE void closeStation();
    void advance(double dt);
    void acceptTransactions(const QVariantList &rows);
    static QVariantMap plant(qulonglong sats);
  signals:
    void changed();

  private:
    QNetworkAccessManager net;
    QTimer clock, poll;
    QElapsedTimer elapsed;
    QString savePath, phase = "camp", source = "waiting";
    QVariantList pool, runPool, obstacles, coins;
    QVariantMap hit;
    double y = 0, velocity = 0, distance = 0, spawn = 0, animation = 0;
    int score = 0, best = 0, wallet = 0, collected = 0, index = 0;
    bool networkEnabled = true;
    bool demoMode = false, held = false, inFlight = false;
    qint64 updated = 0;
    double campX = 320, campY = 235, targetX = 320, targetY = 235;
    QSet<QString> movement;
    bool walkingTo = false;
    QString station;
    QString nearbyStation() const;
    void advanceCamp(double dt);
    void bankRun();
    void spawnPlant();
    void save();
    void end(const QVariantMap &obstacle);
};
