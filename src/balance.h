#pragma once
#include <QJsonObject>
#include <QVariantList>
#include <QVariantMap>
namespace Balance {
const QJsonObject &config();
QVariantList list(const QString &key);
QVariantMap find(const QString &key, const QString &id);
double number(const QString &group, const QString &key);
double height(qulonglong sats, int tier = 1);
double width(double height);
QString species(qulonglong sats);
double bonus(const QString &branch, int level);
int price(const QString &branch, int level);
double jumpVelocity(double heightBonus);
double extraImpulse(double y, double velocity, double fraction = 1);
QString version();
} // namespace Balance
