#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>
#include <string.h>

@interface CodexPetsNotificationController : NSObject <UNUserNotificationCenterDelegate>
@property(nonatomic, strong) NSString *apiBase;
@property(nonatomic, strong) NSString *latestPetId;
@property(nonatomic, strong) NSTimer *timer;
@property(nonatomic, strong) NSMenuItem *menuItem;
@property(nonatomic, assign) BOOL seeded;
@property(nonatomic, assign) BOOL authorizationKnown;
@property(nonatomic, assign) BOOL authorizationRequestPending;
@property(nonatomic, assign) UNAuthorizationStatus authorizationStatus;
+ (instancetype)shared;
- (void)installMenuWithAPIBase:(NSString *)apiBase;
- (void)enableNotifications:(id)sender;
- (void)refreshNotificationMenuState;
- (void)refreshAuthorizationStatus;
- (void)stopPolling;
- (NSString *)notificationStatusJSON;
@end

@implementation CodexPetsNotificationController

static NSString * const CodexPetsNotificationsEnabledKey = @"CodexPetsNotificationsEnabled";

+ (instancetype)shared {
    static CodexPetsNotificationController *sharedController = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedController = [[CodexPetsNotificationController alloc] init];
    });
    return sharedController;
}

- (void)installMenuWithAPIBase:(NSString *)apiBase {
    self.apiBase = [apiBase stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]];
    [UNUserNotificationCenter currentNotificationCenter].delegate = self;
    NSMenu *mainMenu = NSApp.mainMenu;
    if (!mainMenu || mainMenu.numberOfItems == 0 || self.menuItem) return;

    NSMenuItem *appMenuItem = [mainMenu itemAtIndex:0];
    NSMenu *appMenu = appMenuItem.submenu;
    if (!appMenu) return;

    self.menuItem = [[NSMenuItem alloc] initWithTitle:@"Enable New Pet Notifications"
                                               action:@selector(enableNotifications:)
                                        keyEquivalent:@""];
    self.menuItem.target = self;
    [appMenu insertItem:self.menuItem atIndex:MIN((NSInteger)2, (NSInteger)appMenu.numberOfItems)];
    [self refreshNotificationMenuState];
}

- (void)enableNotifications:(id)sender {
    (void)sender;
    if (self.authorizationRequestPending) return;
    self.authorizationRequestPending = YES;
    [[NSUserDefaults standardUserDefaults] setBool:YES forKey:CodexPetsNotificationsEnabledKey];
    [self updateMenuForNotificationStatus];
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound)
                          completionHandler:^(BOOL granted, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            self.authorizationRequestPending = NO;
            self.authorizationKnown = YES;
            if (!granted || error) {
                NSLog(@"Codex Pets notification authorization failed: granted=%d error=%@", granted, error);
                self.authorizationStatus = UNAuthorizationStatusDenied;
                [self updateMenuForNotificationStatus];
                return;
            }
            self.authorizationStatus = UNAuthorizationStatusAuthorized;
            [self updateMenuForNotificationStatus];
            [self startPolling];
        });
    }];
}

- (void)refreshNotificationMenuState {
    [self refreshAuthorizationStatus];
}

- (void)refreshAuthorizationStatus {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    [center getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
        dispatch_async(dispatch_get_main_queue(), ^{
            self.authorizationKnown = YES;
            self.authorizationStatus = settings.authorizationStatus;
            if (settings.authorizationStatus == UNAuthorizationStatusAuthorized ||
                settings.authorizationStatus == UNAuthorizationStatusProvisional) {
                [[NSUserDefaults standardUserDefaults] setBool:YES forKey:CodexPetsNotificationsEnabledKey];
                [self startPolling];
                [self updateMenuForNotificationStatus];
                return;
            }

            if (settings.authorizationStatus == UNAuthorizationStatusDenied) {
                [self stopPolling];
                [self updateMenuForNotificationStatus];
                return;
            }

            [[NSUserDefaults standardUserDefaults] setBool:NO forKey:CodexPetsNotificationsEnabledKey];
            [self updateMenuForNotificationStatus];
        });
    }];
}

- (NSString *)notificationStatusJSON {
    BOOL enabled = [[NSUserDefaults standardUserDefaults] boolForKey:CodexPetsNotificationsEnabledKey] &&
        (self.authorizationStatus == UNAuthorizationStatusAuthorized ||
         self.authorizationStatus == UNAuthorizationStatusProvisional);
    NSString *status = @"available";
    if (self.authorizationRequestPending) {
        status = @"requesting";
    } else if (enabled) {
        status = @"enabled";
    } else if (self.authorizationKnown && self.authorizationStatus == UNAuthorizationStatusDenied) {
        status = @"denied";
    }
    return [NSString stringWithFormat:@"{\"native\":true,\"status\":\"%@\",\"polling\":%@}",
                                      status,
                                      self.timer ? @"true" : @"false"];
}

- (void)updateMenuForNotificationStatus {
    if (!self.menuItem) return;
    NSString *statusJSON = [self notificationStatusJSON];
    if ([statusJSON containsString:@"\"status\":\"enabled\""]) {
        self.menuItem.title = @"New Pet Notifications Enabled";
        self.menuItem.enabled = NO;
        return;
    }
    if ([statusJSON containsString:@"\"status\":\"requesting\""]) {
        self.menuItem.title = @"Requesting New Pet Notifications";
        self.menuItem.enabled = NO;
        return;
    }
    if ([statusJSON containsString:@"\"status\":\"denied\""]) {
        self.menuItem.title = @"New Pet Notifications Unavailable";
        self.menuItem.enabled = NO;
        return;
    }
    self.menuItem.title = @"Enable New Pet Notifications";
    self.menuItem.enabled = YES;
}

- (void)startPolling {
    if (self.timer) return;
    [self fetchLatestPetAndNotify:NO];
    self.timer = [NSTimer scheduledTimerWithTimeInterval:15.0
                                                  target:self
                                                selector:@selector(timerTick:)
                                                userInfo:nil
                                                 repeats:YES];
}

- (void)stopPolling {
    [self.timer invalidate];
    self.timer = nil;
}

- (void)timerTick:(NSTimer *)timer {
    (void)timer;
    [self fetchLatestPetAndNotify:YES];
}

- (void)fetchLatestPetAndNotify:(BOOL)notify {
    if (self.apiBase.length == 0) return;
    NSString *urlString = [NSString stringWithFormat:@"%@/api/pets?page=1&pageSize=1&sort=new&nativePollAt=%.0f",
                                                     self.apiBase,
                                                     [[NSDate date] timeIntervalSince1970] * 1000.0];
    NSURL *url = [NSURL URLWithString:urlString];
    if (!url) return;

    NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:url
                                                             completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        (void)response;
        if (error || !data) return;
        NSError *jsonError = nil;
        NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
        if (jsonError || ![json isKindOfClass:[NSDictionary class]]) return;
        NSArray *pets = json[@"pets"];
        if (![pets isKindOfClass:[NSArray class]] || pets.count == 0) return;
        NSDictionary *pet = pets.firstObject;
        if (![pet isKindOfClass:[NSDictionary class]]) return;
        NSString *petId = [pet[@"id"] isKindOfClass:[NSString class]] ? pet[@"id"] : nil;
        NSString *displayName = [pet[@"displayName"] isKindOfClass:[NSString class]] ? pet[@"displayName"] : petId;
        NSString *ownerName = [pet[@"ownerName"] isKindOfClass:[NSString class]] ? pet[@"ownerName"] : nil;
        if (petId.length == 0) return;

        dispatch_async(dispatch_get_main_queue(), ^{
            if (self.latestPetId.length == 0) {
                self.latestPetId = petId;
                self.seeded = YES;
                return;
            }
            if (![self.latestPetId isEqualToString:petId]) {
                self.latestPetId = petId;
                if (notify && self.seeded) {
                    [self postNotificationForPet:displayName ownerName:ownerName];
                }
                self.seeded = YES;
            }
        });
    }];
    [task resume];
}

- (void)postNotificationForPet:(NSString *)displayName ownerName:(NSString *)ownerName {
    UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
    content.title = @"New Codex pet";
    content.body = ownerName.length > 0
        ? [NSString stringWithFormat:@"%@ by %@", displayName ?: @"New pet", ownerName]
        : (displayName ?: @"A new pet was added.");
    content.sound = [UNNotificationSound defaultSound];

    NSString *identifier = [NSString stringWithFormat:@"codex-pets-new-pet-%@", [[NSUUID UUID] UUIDString]];
    UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier
                                                                          content:content
                                                                          trigger:nil];
    [[UNUserNotificationCenter currentNotificationCenter] addNotificationRequest:request withCompletionHandler:^(NSError *error) {
        if (error) {
            NSLog(@"Codex Pets notification delivery failed: %@", error);
        }
    }];
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler {
    (void)center;
    (void)notification;
    completionHandler(UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionSound);
}

@end

void codex_pets_native_install_menu(const char *api_base, size_t api_base_len) {
    NSString *apiBase = [[NSString alloc] initWithBytes:api_base
                                                length:api_base_len
                                              encoding:NSUTF8StringEncoding] ?: @"";
    dispatch_async(dispatch_get_main_queue(), ^{
        [[CodexPetsNotificationController shared] installMenuWithAPIBase:apiBase];
    });
}

void codex_pets_native_enable_notifications(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[CodexPetsNotificationController shared] enableNotifications:nil];
    });
}

size_t codex_pets_native_notification_status(char *buffer, size_t buffer_len) {
    __block NSString *statusJSON = @"{\"native\":true,\"status\":\"available\",\"polling\":false}";
    if ([NSThread isMainThread]) {
        CodexPetsNotificationController *controller = [CodexPetsNotificationController shared];
        [controller refreshAuthorizationStatus];
        statusJSON = [controller notificationStatusJSON];
    } else {
        dispatch_sync(dispatch_get_main_queue(), ^{
            CodexPetsNotificationController *controller = [CodexPetsNotificationController shared];
            [controller refreshAuthorizationStatus];
            statusJSON = [controller notificationStatusJSON];
        });
    }
    NSData *data = [statusJSON dataUsingEncoding:NSUTF8StringEncoding] ?: [NSData data];
    size_t count = MIN(buffer_len, data.length);
    if (count > 0) {
        memcpy(buffer, data.bytes, count);
    }
    return count;
}
