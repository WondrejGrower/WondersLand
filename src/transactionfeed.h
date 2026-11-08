#pragma once
#include <QRandomGenerator>
#include <QSet>
#include <QVariantList>
class TransactionQueue {
  public:
    void receive(const QVariantList &rows);
    void begin(quint32 seed);
    QVariantMap take();
    int size() const { return available.size(); }
    QVariantList recent() const { return cache; }
    int usedCount() const { return used.size(); }

  private:
    QVariantList cache, available;
    QSet<QString> used, seen;
    QRandomGenerator rng{1};
};
