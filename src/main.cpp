#include "backend.h"
#include "theme.h"
#include "translator.h"
#include <QFile>
#include <QGuiApplication>
#include <QIcon>
#include <QJsonDocument>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QTemporaryDir>
#include <QTextStream>
#include <QTimer>
int main(int argc, char **argv) {
    const QString command = argc > 1 ? QString::fromLocal8Bit(argv[1]) : "open";
    if (command == "check" || command == "preview" || command == "language") {
        qputenv("QT_QPA_PLATFORM", "offscreen");
        qputenv("QT_QPA_PLATFORMTHEME", "");
    }
    QGuiApplication app(argc, argv);
    app.setApplicationName("wondersland-game");
    app.setDesktopFileName("wondersland-game");
    app.setWindowIcon(QIcon::fromTheme("wondersland-game"));
    QQuickStyle::setStyle("Material");
    if (command == "language") {
        const QString code = app.arguments().value(2);
        if (code != "cs" && code != "en")
            return 1;
        Translator translator;
        translator.setLanguage(code);
        return translator.language() == code ? 0 : 1;
    }
    if (command == "check") {
        if (app.arguments().contains("--live")) {
            QTemporaryDir probeDirectory;
            Backend probe(probeDirectory.filePath("progress.json"), true);
            bool completed = false;
            QObject::connect(&probe, &Backend::changed, &app, [&] {
                if (completed)
                    return;
                const auto state = probe.state();
                if (state["source"] == "live") {
                    completed = true;
                    QTextStream(stdout)
                        << QJsonDocument::fromVariant(
                               QVariantMap{{"live", true}, {"transactions", state["poolSize"]}})
                               .toJson();
                    app.exit(0);
                } else if (state["source"] == "offline") {
                    completed = true;
                    QTextStream(stderr) << "Mempool source unavailable.\n";
                    app.exit(1);
                }
            });
            QTimer::singleShot(12000, &app, [&] { app.exit(1); });
            return app.exec();
        }
        QTextStream(stdout)
            << "{\"application\":\"WondersLand [WL]\",\"version\":\"0.3.3\",\"standalone\":true}\n";
        return 0;
    }
    if (command != "open" && command != "preview") {
        QTextStream(stderr) << "Usage: wondersland-game [open|check --json|preview <png>]\n";
        return 1;
    }
    QTemporaryDir previewDirectory;
    QString saveFile = command == "preview" ? previewDirectory.filePath("progress.json") : QString();
    if (command == "preview" && app.arguments().contains("--progress")) {
        Progress fixture(saveFile);
        fixture.create({{"name", "Willow"},
                        {"class", "gardener"},
                        {"hair", "#d6b96d"},
                        {"skin", "#dfaf87"},
                        {"shirt", "#679e86"},
                        {"hairStyle", 1}});
        fixture.data["coins"] = 10000;
        fixture.data["runs"] = 5;
        fixture.data["totalDistance"] = 7000;
        fixture.data["bestDistance"] = 3500;
        fixture.updateUnlocks(false);
        fixture.data["tier"] = 3;
        fixture.data["seeds"] = 3;
        fixture.data["milestones"] = QStringList{"T1:60", "T2:120"};
        fixture.save();
    }
    Backend backend(saveFile, command != "preview" && !app.arguments().contains("--dataset"));
    QObject::connect(&app, &QCoreApplication::aboutToQuit, &backend, &Backend::settle);
    if (app.arguments().contains("--dataset")) {
        int index = app.arguments().indexOf("--dataset");
        QFile file(app.arguments().value(index + 1));
        if (!file.open(QIODevice::ReadOnly)) {
            QTextStream(stderr) << "Cannot read dataset\n";
            return 1;
        }
        auto dataset = QJsonDocument::fromJson(file.readAll()).toVariant().toMap();
        if (dataset.value("synthetic").toBool()) {
            QTextStream(stderr) << "Synthetic datasets belong to training/tests.\n";
            return 1;
        }
        int seedIndex = app.arguments().indexOf("--seed");
        quint32 fixedSeed = seedIndex < 0 ? 1 : app.arguments().value(seedIndex + 1).toUInt();
        backend.setReplay(dataset["transactions"].toList(), fixedSeed);
    }
    Theme theme;
    QString previewLanguage;
    if (command == "preview") {
        previewLanguage = previewDirectory.filePath("language");
        QFile language(previewLanguage);
        if (language.open(QIODevice::WriteOnly))
            language.write(app.arguments().contains("--cs") ? "cs\n" : "en\n");
    }
    Translator translator(previewLanguage);
    app.installTranslator(&translator);
    QQmlApplicationEngine engine;
    QObject::connect(&translator, &Translator::changed, &engine, &QQmlApplicationEngine::retranslate);
    engine.rootContext()->setContextProperty("backend", &backend);
    engine.rootContext()->setContextProperty("theme", &theme);
    engine.rootContext()->setContextProperty("translator", &translator);
    engine.load(QUrl("qrc:/Main.qml"));
    if (engine.rootObjects().isEmpty())
        return 1;
    if (command == "preview") {
        const auto args = app.arguments();
        if (args.contains("--camp") || args.contains("--runner") || args.contains("--workshop") ||
            args.contains("--results") || args.contains("--select") || args.contains("--training") || args.contains("--inventory")) {
            if (backend.state()["phase"] == "creation")
                backend.createCharacter("Willow", "gardener", "#d6b96d", "#dfaf87", "#679e86", 1);
        }
        if (args.contains("--runner") || args.contains("--results") || args.contains("--select")) {
            backend.start(!args.contains("--dataset"));
            if (!args.contains("--select")) {
                backend.chooseSkill(0);
                for (int i = 0; i < (args.contains("--results") ? 600 : 110); i++)
                    backend.advance(.016);
            }
        }
        if (args.contains("--workshop") || args.contains("--training")) {
            backend.walkTo(args.contains("--training") ? 465 : 112, args.contains("--training") ? 290 : 225);
            for (int i = 0; i < 200; i++)
                backend.advance(.05);
            backend.interact();
        }
        if (args.contains("--runner"))
            backend.previewScene();
        if (args.contains("--inventory")) backend.openInventory();
        backend.freezePreview();
        auto window = qobject_cast<QQuickWindow *>(engine.rootObjects().first());
        if (args.contains("--settings"))
            window->setProperty("settingsOpen", true);
        int sizeIndex = args.indexOf("--size");
        if (sizeIndex >= 0) {
            auto dimensions = args.value(sizeIndex + 1).split('x');
            window->resize(dimensions.value(0).toInt(), dimensions.value(1).toInt());
        }
        if (args.contains("--small"))
            window->resize(720, 600);
        QString output = argc > 2 ? QString::fromLocal8Bit(argv[2]) : "preview.png";
        QTimer::singleShot(900, &app,
                           [&app, window, output] { app.exit(window->grabWindow().save(output) ? 0 : 1); });
    }
    return app.exec();
}
