package com.hp.autonomy.frontend.find.view;

import com.hp.autonomy.frontend.find.ApiKeyService;
import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResponseExtractor;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by john.underwood on 2/18/2015.
 */
@Service
public class ViewServiceImpl implements ViewService {

    @Autowired
    private ApiKeyService apiKeyService;

    @Autowired
    private RestTemplate restTemplate;

    @Override
    public void viewDocument(String reference, OutputStream outputStream) {
        final Map<String, String> parameters = new HashMap<>();
        parameters.put("apikey", apiKeyService.getApiKey());
        parameters.put("url", reference);

        restTemplate.execute("https://api.idolondemand.com/1/api/sync/viewdocument/v1?apikey={apikey}&url={url}", HttpMethod.GET, null, new CopyResponseExtractor(outputStream), parameters);
    }

    private static class CopyResponseExtractor implements ResponseExtractor<Boolean> {

        private final OutputStream outputStream;

        private CopyResponseExtractor(OutputStream outputStream) {
            this.outputStream = outputStream;
        }

        @Override
        public Boolean extractData(ClientHttpResponse response) throws IOException {
            IOUtils.copy(response.getBody(), outputStream);

            return true;
        }
    }
}
