#pragma once

#include <QFileSystemWatcher>
#include <QHash>
#include <QJsonValue>
#include <QLocale>
#include <QTimer>
#include <QTranslator>

// Per-application English/Czech choice, persisted independently of progress.
// English source keys are shared by QML, configuration and Canvas labels.
// An explicit choice overrides the desktop language; new installs use English.
class Translator : public QTranslator {
    Q_OBJECT
    Q_PROPERTY(QString language READ language NOTIFY changed)

  public:
    explicit Translator(const QString &languageFile = {}, const QString &catalogDirectory = ":/i18n",
                        QObject *parent = nullptr);

    Q_INVOKABLE void setLanguage(const QString &code);
    Q_INVOKABLE QString text(const QString &source) const;
    Q_INVOKABLE QString integer(const QString &digits) const;
    Q_INVOKABLE QString btc(const QString &amount) const;
    Q_INVOKABLE QString coins(int count) const;
    Q_INVOKABLE QString seeds(int count) const;
    QString language() const { return m_language; }
    bool isEmpty() const override { return m_strings.isEmpty(); }
    QString translate(const char *context, const char *sourceText, const char *disambiguation = nullptr,
                      int n = -1) const override;

    static QString readLanguage(const QString &path);
    static QString pluralCategory(const QString &language, long long count);
    static QLocale formatLocale(const QString &language);

  signals:
    void changed();

  private:
    void reload();

    QString m_settingsPath;
    QString m_selected;
    QString m_languageFile;
    QString m_catalogDirectory;
    QString m_language;
    QHash<QString, QJsonValue> m_strings;
    QFileSystemWatcher m_watcher;
    QTimer m_debounce;
};
