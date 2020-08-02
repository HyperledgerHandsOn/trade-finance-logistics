transactionMergeAssets {
-->AssetmergeFrom
-->AssetmergeTo
}

/**
  * Sample transaction
  * @param{org.example.biznet.MergeAssets}tx
  * @transaction
  */
functiononMergeAssets(tx) {
  varassetRegistry;
  varmergeFromAsset=tx.mergeFrom;
  varmergeToAsset=tx.mergeTo;
  mergeToAsset.value+=tx.mergeFrom.value;

returngetAssetRegistry('org.example.biznet.SampleAsset')
    .then(function(ar) {
      assetRegistry=ar;
      returnassetRegistry.update(mergeToAsset);
    })
    .then(function() {
      returnassetRegistry.remove(mergeFromAsset);
    });
}
