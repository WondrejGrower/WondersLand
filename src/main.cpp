#include "backend.h"
#include "theme.h"
#include "translator.h"
#include <QGuiApplication>
#include <QIcon>
#include <QJsonDocument>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QTextStream>
#include <QTimer>
int main(int argc, char **argv) {
    const QString command = argc > 1 ? QString::fromLocal8Bit(argv[1]) : "open";
    if (command == "check" || command == "preview") {
        qputenv("QT_QPA_PLATFORM", "offscreen");
        qputenv("QT_QPA_PLATFORMTHEME", "");
    }
    QGuiApplication app(argc, argv);
    app.setApplicationName("wondersland-game");
    app.setDesktopFileName("wondersland-game");
    app.setWindowIcon(QIcon::fromTheme("wondersland-game"));
    QQuickStyle::setStyle("Material");
    if (command == "check") {
        if (app.arguments().contains("--live")) {
            Backend probe({}, true);
            QObject::connect(&probe, &Backend::changed, &app, [&] {
                const auto state = probe.state();
                if (state["source"] == "live") {
                    QTextStream(stdout)
                        << QJsonDocument::fromVariant(
                               QVariantMap{{"live", true}, {"transactions", state["poolSize"]}})
                               .toJson();
                    app.exit(0);
                } else if (state["source"] == "offline") {
                    QTextStream(stderr) << "Mempool source unavailable.\n";
                    app.exit(1);
                }
            });
            QTimer::singleShot(12000, &app, [&] { app.exit(1); });
            return app.exec();
        }
        QTextStream(stdout)
            << "{\"application\":\"WondersLand [WL]\",\"version\":\"0.2.0\",\"standalone\":true}\n";
        return 0;
    }
    if (command != "open" && command != "preview") {
        QTextStream(stderr) << "Usage: wondersland-game [open|check --json|preview <png>]\n";
        return 1;
    }
    Backend backend(command == "preview" ? "/tmp/wondersland-preview-progress.json" : "",
                    command != "preview");
    Theme theme;
    Translator translator;
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
        if (app.arguments().contains("--runner")) {
            backend.start(true);
            for (int i = 0; i < 110; i++)
                backend.advance(.016);
        }
        auto window = qobject_cast<QQuickWindow *>(engine.rootObjects().first());
        QString output = argc > 2 ? QString::fromLocal8Bit(argv[2]) : "preview.png";
        QTimer::singleShot(900, &app,
                           [&app, window, output] { app.exit(window->grabWindow().save(output) ? 0 : 1); });
    }
    return app.exec();
}
