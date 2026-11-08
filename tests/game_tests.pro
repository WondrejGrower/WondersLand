QT += core gui qml quick quickcontrols2 network testlib
CONFIG += c++17 testcase
TARGET = game_tests
HEADERS += ../src/backend.h ../src/balance.h ../src/progress.h ../src/transactionfeed.h ../src/theme.h ../src/translator.h
SOURCES += game_tests.cpp ../src/backend.cpp ../src/balance.cpp ../src/progress.cpp ../src/transactionfeed.cpp ../src/theme.cpp ../src/translator.cpp
RESOURCES += ../src/resources.qrc
