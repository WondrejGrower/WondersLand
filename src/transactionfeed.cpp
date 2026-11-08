#include "transactionfeed.h"
#include <QRegularExpression>
#include <cmath>
void TransactionQueue::receive(const QVariantList &rows) {
    for (auto value : rows) {
        auto row = value.toMap();
        auto id = row["txid"].toString();
        bool ok = false;
        qulonglong sats = 0;
        if (row["value"].metaType().id() == QMetaType::Double) {
            double n = row["value"].toDouble();
            ok = std::isfinite(n) && n >= 0 && std::floor(n) == n && n <= 2100000000000000.;
            if (ok)
                sats = qulonglong(n);
        } else if (QRegularExpression("^[0-9]+$").match(row["value"].toString()).hasMatch())
            sats = row["value"].toULongLong(&ok);
        if (!ok || !QRegularExpression("^[a-f0-9]{64}$").match(id).hasMatch() || seen.contains(id))
            continue;
        seen.insert(id);
        row["value"] = QString::number(sats);
        cache.append(row);
        if (!used.contains(id))
            available.append(row);
    }
    while (cache.size() > 512) {
        auto id = cache.takeFirst().toMap()["txid"].toString();
        seen.remove(id);
    }
    while (available.size() > 512)
        available.removeFirst();
}
void TransactionQueue::begin(quint32 seed) {
    rng.seed(seed);
    used.clear();
    available = cache;
}
QVariantMap TransactionQueue::take() {
    if (available.isEmpty() || used.size() >= 10000)
        return {};
    int i = rng.bounded(available.size());
    auto row = available.takeAt(i).toMap();
    auto id = row["txid"].toString();
    if (used.contains(id))
        return take();
    used.insert(id);
    return row;
}
