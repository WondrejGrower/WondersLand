#include "balance.h"
#include <QFile>
#include <QHash>
#include <QJsonArray>
#include <QJsonDocument>
#include <algorithm>
#include <cmath>
const QJsonObject &Balance::config() {
    static const auto data = [] {
        QFile f(":/balance.json");
        if (!f.open(QIODevice::ReadOnly))
            qFatal("Missing balance.json");
        return QJsonDocument::fromJson(f.readAll()).object();
    }();
    return data;
}
QVariantList Balance::list(const QString &key) {
    static QHash<QString, QVariantList> cache;
    if (!cache.contains(key))
        cache.insert(key, config()[key].toArray().toVariantList());
    return cache.value(key);
}
QVariantMap Balance::find(const QString &key, const QString &id) {
    static QHash<QString, QVariantMap> cache;
    auto lookup = key + ":" + id;
    if (cache.contains(lookup))
        return cache.value(lookup);
    for (auto v : list(key)) {
        auto m = v.toMap();
        if (m["id"] == id) {
            cache.insert(lookup, m);
            return m;
        }
    }
    return {};
}
double Balance::number(const QString &group, const QString &key) {
    return config()[group].toObject()[key].toDouble();
}
QString Balance::version() { return config()["balanceVersion"].toString(); }
double Balance::height(qulonglong sats, int tier) {
    auto anchors = config()["anchors"].toArray();
    double h;
    if (sats < 100000)
        h = 4 + 8 * std::sqrt(double(sats) / 100000.);
    else {
        int i = 0;
        while (i + 1 < anchors.size() && double(sats) >= anchors[i + 1].toArray()[0].toDouble())
            i++;
        auto a = anchors[i].toArray();
        double v = a[0].toDouble(), base = a[1].toDouble();
        if (i + 1 == anchors.size())
            h = base * std::pow(1.5, std::log10(double(sats) / v));
        else {
            auto b = anchors[i + 1].toArray();
            double t = std::log(double(sats) / v) / std::log(b[0].toDouble() / v);
            h = std::exp(std::log(base) + t * std::log(b[1].toDouble() / base));
        }
    }
    Q_UNUSED(tier); // Legacy API argument: transaction dimensions are region independent.
    return std::round(h);
}
double Balance::width(double h) {
    return std::clamp(std::round(number("width", "base") + number("width", "slope") * h),
                      number("width", "min"), number("width", "max"));
}
QString Balance::species(qulonglong v) {
    if (QString::number(v).startsWith("420"))
        return "cannabis";
    return v < 100000            ? "flower"
           : v < 350000          ? "tulip"
           : v < 800000          ? "rose"
           : v < 1000000         ? "fern"
           : v < 100000000       ? "birch"
           : v < 1000000000      ? "pine"
           : v < 100000000000ULL ? "oak"
                                 : "sequoia";
}
double Balance::bonus(const QString &branch, int level) {
    auto b = find("workshop", branch);
    double x = std::clamp(level, 0, 50) / 50.;
    return b["effect"].toDouble() * (b["curve"] == "sqrt" ? std::sqrt(x) : x);
}
int Balance::price(const QString &branch, int level) {
    auto b = find("workshop", branch);
    return level >= 50 ? -1
                       : int(std::ceil(b["baseCost"].toDouble() *
                                       std::pow(b["growth"].toDouble(), std::max(0, level))));
}
// Height scales with velocity squared. Caps are enforced by remaining ascent energy,
// not by clipping coordinates against an invisible ceiling.
double Balance::jumpVelocity(double bonus) {
    double base = number("physics", "jumpVelocity"), g = number("physics", "heldGravity");
    return std::min(base * std::sqrt(std::max(0., 1 + bonus)),
                    std::sqrt(2 * g * number("physics", "jumpCap")));
}
double Balance::extraImpulse(double y, double velocity, double fraction) {
    Q_UNUSED(velocity);
    double available = std::max(0., number("physics", "airCap") - y);
    return std::sqrt(2 * number("physics", "heldGravity") * available) * std::clamp(fraction, 0., 1.);
}
