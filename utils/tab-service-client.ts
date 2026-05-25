import { createProxyService } from '@webext-core/proxy-service';
import { TAB_SERVICE_KEY, type TabService } from './tab-service';

export const tabService: TabService = createProxyService(TAB_SERVICE_KEY);
