import KeycloakConnect from 'keycloak-connect';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { KEYCLOAK_CONNECT_OPTIONS, KEYCLOAK_INSTANCE } from './constants';
import { KeycloakConnectModuleAsyncOptions } from './interface/keycloak-connect-module-async-options.interface';
import { KeycloakConnectOptionsFactory } from './interface/keycloak-connect-options-factory.interface';
import { KeycloakService } from './keycloak.service';

export * from './decorators/publicPath.decorator';
export * from './decorators/resource.decorator';
export * from './decorators/roles.decorator';
export * from './decorators/scopes.decorator';
export * from './guards/auth.guard';
export * from './guards/resource.guard';

declare interface KeycloakConnectOptions {
  authServerUrl: string;
  clientId?: string;
  realm?: string;
  realmPublicKey?: string;
  secret?: string;
}

@Module({
  providers: [KeycloakService],
  exports: [KeycloakService]
})
export class KeycloakConnectModule {
  public static register(options: KeycloakConnectOptions): DynamicModule {
    return {
      module: KeycloakConnectModule,
      providers: [
        {
          provide: KEYCLOAK_CONNECT_OPTIONS,
          useValue: options
        },
        this.keycloakProvider
      ],
      exports: [this.keycloakProvider]
    };
  }

  public static registerAsync(
    options: KeycloakConnectModuleAsyncOptions
  ): DynamicModule {
    return {
      module: KeycloakConnectModule,
      imports: options.imports || [],
      providers: [this.createConnectProviders(options), this.keycloakProvider],
      exports: [this.keycloakProvider]
    };
  }

  private static createConnectProviders(
    options: KeycloakConnectModuleAsyncOptions
  ) {
    if (options.useExisting || options.useFactory) {
      return this.createConnectOptionsProvider(options);
    }
    return {
      provide: options.useClass,
      useClass: options.useClass
    };
  }

  private static createConnectOptionsProvider(
    options: KeycloakConnectModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: KEYCLOAK_CONNECT_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || []
      };
    }
    return {
      provide: KEYCLOAK_CONNECT_OPTIONS,
      useFactory: async (optionsFactory: KeycloakConnectOptionsFactory) =>
        await optionsFactory.createKeycloakConnectOptions(),
      inject: [options.useExisting || options.useClass]
    };
  }

  private static keycloakProvider: Provider = {
    provide: KEYCLOAK_INSTANCE,
    useFactory: (options: KeycloakConnectOptions) => {
      const keycloak: any = new KeycloakConnect({}, options as any);
      keycloak.accessDenied = (req: any, _res: any, next: any) => {
        req.resourceDenied = true;
        next();
      };
      return keycloak;
    },
    inject: [KEYCLOAK_CONNECT_OPTIONS]
  };
}